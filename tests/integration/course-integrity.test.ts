import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

/**
 * Course integrity (migration 20261011090000_course_integrity.sql), evaluated as
 * real `authenticated` / `service_role` callers inside rolled-back transactions:
 *
 *  - the licensing delete guard refuses a direct DELETE of a licensed course, so the
 *    cascade can never silently remove agreements (the app 409 is not the only gate);
 *  - the rollback probe drops the trigger, shows the very same DELETE then succeeds
 *    and cascades the agreement away, and rolls back: the denial comes from the
 *    trigger, not from something incidental;
 *  - course slugs are globally unique.
 */

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.DB_URL ||
  'postgresql://postgres:postgres@127.0.0.1:49322/postgres';

const SCHOLAR_A_ACCOUNT = 'a1000000-0000-0000-0000-000000000002';
const ADMIN_ACCOUNT = 'a1000000-0000-0000-0000-000000000001';

type Caller = { role: 'authenticated'; sub: string } | { role: 'service_role' };
type PgError = { code?: string; message: string };

describe('course integrity — real database roles', () => {
  let client: Client;
  let scholarA: string;
  let otherScholar: string;

  beforeAll(async () => {
    client = new Client({ connectionString: dbUrl });
    await client.connect();
    scholarA = (await client.query(`SELECT id FROM public.scholars WHERE account_id = $1`, [SCHOLAR_A_ACCOUNT])).rows[0].id;
    otherScholar = (await client.query(`SELECT id FROM public.scholars WHERE id <> $1 LIMIT 1`, [scholarA])).rows[0].id;
  });

  afterAll(async () => {
    await client.end();
  });

  async function inTx(body: () => Promise<void>) {
    await client.query('BEGIN');
    try {
      await body();
    } finally {
      await client.query('ROLLBACK');
    }
  }

  async function asCaller(caller: Caller, body: () => Promise<void>) {
    await client.query(`SET LOCAL ROLE ${caller.role}`);
    await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [JSON.stringify(caller)]);
    try {
      await body();
    } finally {
      await client.query('RESET ROLE');
    }
  }

  const asScholar = (body: () => Promise<void>) => asCaller({ role: 'authenticated', sub: SCHOLAR_A_ACCOUNT }, body);

  /** A licensed course owned by scholar A, created as the migration role. */
  async function seedLicensedCourse(): Promise<{ courseId: string }> {
    const course = await client.query(
      `INSERT INTO public.courses (scholar_id, title, slug, level, visibility)
       VALUES ($1, 'Integrity Probe', 'integrity-probe-slug', 'graduate', 'private') RETURNING id`,
      [scholarA]
    );
    const courseId = course.rows[0].id as string;
    const inst = await client.query(
      `INSERT INTO public.institutions (name, slug, institution_type, status, contact_email, location)
       VALUES ('Integrity Probe Seminary', 'integrity-probe-inst', 'seminary', 'approved', 'probe@test.faithfullscholars.dev', 'Probe City')
       RETURNING id`
    );
    await client.query(
      `INSERT INTO public.course_licensing_agreements (course_id, scholar_id, institution_id, license_type, term_duration)
       VALUES ($1, $2, $3, 'syllabus_only', '1_semester')`,
      [courseId, scholarA, inst.rows[0].id]
    );
    return { courseId };
  }

  const agreementCount = async (courseId: string) =>
    Number((await client.query(`SELECT COUNT(*) AS n FROM public.course_licensing_agreements WHERE course_id = $1`, [courseId])).rows[0].n);

  async function failure(sql: string, params: unknown[]): Promise<PgError> {
    await client.query('SAVEPOINT attempt');
    let error: PgError | null = null;
    try {
      await client.query(sql, params);
    } catch (err) {
      error = err as PgError;
    }
    await client.query('ROLLBACK TO SAVEPOINT attempt');
    if (!error) throw new Error(`Expected a failure but the statement succeeded: ${sql}`);
    return error;
  }

  it('refuses a direct DELETE of a licensed own course (42501) and keeps the agreement', async () => {
    await inTx(async () => {
      const { courseId } = await seedLicensedCourse();
      await asScholar(async () => {
        const error = await failure(`DELETE FROM public.courses WHERE id = $1`, [courseId]);
        expect(error.code).toBe('42501');
        expect(error.message).toMatch(/^Unauthorized: this course has licensing agreements; make it private instead/);
      });
      expect(await agreementCount(courseId)).toBe(1);
      expect((await client.query(`SELECT 1 FROM public.courses WHERE id = $1`, [courseId])).rowCount).toBe(1);
    });
  });

  it('still lets the scholar delete an own course with no agreements', async () => {
    await inTx(async () => {
      const course = await client.query(
        `INSERT INTO public.courses (scholar_id, title, slug, level) VALUES ($1, 'No Licence', 'integrity-no-licence', 'graduate') RETURNING id`,
        [scholarA]
      );
      await asScholar(async () => {
        const res = await client.query(`DELETE FROM public.courses WHERE id = $1`, [course.rows[0].id]);
        expect(res.rowCount).toBe(1);
      });
    });
  });

  it('leaves admin and service role (operational cleanup) unaffected', async () => {
    for (const caller of [{ role: 'authenticated', sub: ADMIN_ACCOUNT }, { role: 'service_role' }] as Caller[]) {
      await inTx(async () => {
        const { courseId } = await seedLicensedCourse();
        await asCaller(caller, async () => {
          const res = await client.query(`DELETE FROM public.courses WHERE id = $1`, [courseId]);
          expect(res.rowCount).toBe(1);
        });
        expect(await agreementCount(courseId)).toBe(0);
      });
    }
  });

  it('rollback probe: without the trigger the same DELETE succeeds and cascades the agreement away', async () => {
    await inTx(async () => {
      const { courseId } = await seedLicensedCourse();
      await client.query(`DROP TRIGGER trg_guard_course_delete ON public.courses`);
      await asScholar(async () => {
        const res = await client.query(`DELETE FROM public.courses WHERE id = $1`, [courseId]);
        expect(res.rowCount).toBe(1);
      });
      expect(await agreementCount(courseId)).toBe(0);
    });
    // The rollback restored the trigger: the guard works again.
    await inTx(async () => {
      const { courseId } = await seedLicensedCourse();
      await asScholar(async () => {
        expect((await failure(`DELETE FROM public.courses WHERE id = $1`, [courseId])).code).toBe('42501');
      });
    });
  });

  it('course slugs are globally unique, while the per-scholar rule still applies', async () => {
    await inTx(async () => {
      await client.query(
        `INSERT INTO public.courses (scholar_id, title, slug, level) VALUES ($1, 'Same', 'integrity-same-slug', 'graduate')`,
        [scholarA]
      );
      const cross = await failure(
        `INSERT INTO public.courses (scholar_id, title, slug, level) VALUES ($1, 'Same', 'integrity-same-slug', 'graduate')`,
        [otherScholar]
      );
      expect(cross.code).toBe('23505');
      const same = await failure(
        `INSERT INTO public.courses (scholar_id, title, slug, level) VALUES ($1, 'Same', 'integrity-same-slug', 'graduate')`,
        [scholarA]
      );
      expect(same.code).toBe('23505');
    });
  });
});
