/**
 * ==============================================================================
 * FaithFull Scholars — Pilot Cohort Seed Expansion Script
 * Populates 3 additional reference scholars to reach the pilot-recommended
 * 5-scholar cohort across Reformed, Baptist, Anglican, and Presbyterian traditions.
 *
 * Usage: npx tsx scripts/seed-pilot-cohort.ts
 * ==============================================================================
 */

import { Client } from 'pg';

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.DB_URL ||
  'postgresql://postgres:postgres@127.0.0.1:49322/postgres';

export async function seedPilotCohort() {
  console.log('\n============================================================');
  console.log('   FaithFull Scholars — Seeding Pilot Reference Cohort       ');
  console.log('============================================================\n');

  const client = new Client({ connectionString: dbUrl });

  try {
    await client.connect();
    console.log(`Connected to database at ${dbUrl.replace(/:[^:@]+@/, ':***@')}\n`);

    await client.query('BEGIN;');

    // 1. Insert Auth Users
    await client.query(`
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) VALUES
        ('a1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.thomas.cranmer@faithfullscholars.org', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
        ('a1000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.marcus.vance@faithfullscholars.org', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
        ('a1000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.elizabeth.knox@faithfullscholars.org', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
      ON CONFLICT (id) DO NOTHING;
    `);

    // 2. Insert Accounts
    await client.query(`
      INSERT INTO public.accounts (id, email, role) VALUES
        ('a1000000-0000-0000-0000-000000000005', 'dr.thomas.cranmer@faithfullscholars.org', 'scholar'),
        ('a1000000-0000-0000-0000-000000000006', 'dr.marcus.vance@faithfullscholars.org', 'scholar'),
        ('a1000000-0000-0000-0000-000000000007', 'dr.elizabeth.knox@faithfullscholars.org', 'scholar')
      ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role;
    `);

    // 3. Insert Scholars
    await client.query(`
      INSERT INTO public.scholars (
        id, account_id, slug, full_name, title, current_institution, institutional_role,
        biography, location, timezone, contact_preference, profile_status, verification_status,
        doctrinal_statement_text
      ) VALUES
        (
          'f1000000-0000-0000-0000-000000000003',
          'a1000000-0000-0000-0000-000000000005',
          'thomas-cranmer-davies',
          'Dr. Thomas Cranmer-Davies',
          'Professor of Old Testament & Hebrew Scriptures',
          'Trinity Evangelical Divinity School',
          'Senior Research Fellow in Semitics',
          'Specializing in West Semitic philology, poetic parallelism in the Psalms of Lament, and the theological reception of the Hebrew Canon. Over 15 years of postgraduate Hebrew exegesis teaching.',
          'Oxford, UK',
          'Europe/London',
          'institution_inquiry',
          'approved',
          'verified',
          'I gladly subscribe to the historic Thirty-Nine Articles of Religion and affirm the full canonical inspiration, authority, and infallibility of the Old and New Testaments as God-breathed revelation.'
        ),
        (
          'f1000000-0000-0000-0000-000000000004',
          'a1000000-0000-0000-0000-000000000006',
          'marcus-vance',
          'Dr. Marcus Aurelius Vance',
          'Associate Professor of Christian Apologetics & Systematic Theology',
          'Southern Baptist Theological Seminary',
          'Associate Professor',
          'Focused on presuppositional apologetics, transcendental epistemological arguments, and Reformed Baptist covenant theology. Regular speaker at theological conferences on worldview and cultural engagement.',
          'Louisville, KY',
          'America/New_York',
          'institution_inquiry',
          'approved',
          'verified',
          'I affirm with full conviction the Second London Baptist Confession of Faith (1689), the Chicago Statement on Biblical Inerrancy, and the historic Nicene Creed.'
        ),
        (
          'f1000000-0000-0000-0000-000000000005',
          'a1000000-0000-0000-0000-000000000007',
          'elizabeth-montgomery-knox',
          'Dr. Elizabeth Montgomery-Knox',
          'Associate Professor of Christian Ethics & Practical Theology',
          'Reformed Theological Seminary',
          'Chair of Christian Ethics',
          'Researching Christian bioethics, virtue ethics in pastoral ministry, and the intersection of covenant theology with modern bioethics and medicine. Extensive background in hospital chaplaincy.',
          'Charlotte, NC',
          'America/New_York',
          'institution_inquiry',
          'approved',
          'verified',
          'I subscribe sincerely to the Westminster Confession of Faith and Catechisms as containing the system of doctrine taught in the Holy Scriptures of the Old and New Testaments.'
        )
      ON CONFLICT (slug) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        title = EXCLUDED.title,
        biography = EXCLUDED.biography,
        profile_status = 'approved',
        verification_status = 'verified';
    `);

    // 4. Insert Profile Revisions
    await client.query(`
      INSERT INTO public.scholar_profile_revisions (
        id, scholar_id, revision_number, status, snapshot_data, admin_notes, submitted_at, reviewed_at
      ) VALUES
        (
          '01000000-0000-0000-0000-000000000003',
          'f1000000-0000-0000-0000-000000000003',
          1,
          'approved',
          '{"full_name": "Dr. Thomas Cranmer-Davies", "title": "Professor of Old Testament & Hebrew Scriptures", "biography": "Specializing in West Semitic philology, poetic parallelism in the Psalms of Lament, and Hebrew Canon reception."}'::jsonb,
          'Verified doctoral credentials with Oxford University registry.',
          now() - interval '20 days',
          now() - interval '19 days'
        ),
        (
          '01000000-0000-0000-0000-000000000004',
          'f1000000-0000-0000-0000-000000000004',
          1,
          'approved',
          '{"full_name": "Dr. Marcus Aurelius Vance", "title": "Associate Professor of Christian Apologetics & Systematic Theology", "biography": "Focused on presuppositional apologetics, transcendental epistemological arguments, and Reformed Baptist covenant theology."}'::jsonb,
          'Verified faculty status and doctoral credentials.',
          now() - interval '18 days',
          now() - interval '17 days'
        ),
        (
          '01000000-0000-0000-0000-000000000005',
          'f1000000-0000-0000-0000-000000000005',
          1,
          'approved',
          '{"full_name": "Dr. Elizabeth Montgomery-Knox", "title": "Associate Professor of Christian Ethics & Practical Theology", "biography": "Researching Christian bioethics, virtue ethics in pastoral ministry, and covenant theology."}'::jsonb,
          'Verified PTS doctoral degree and bioethics publications.',
          now() - interval '15 days',
          now() - interval '14 days'
        )
      ON CONFLICT (scholar_id, revision_number) DO NOTHING;
    `);

    // Link published revision IDs
    await client.query(`
      UPDATE public.scholars SET published_revision_id = '01000000-0000-0000-0000-000000000003' WHERE id = 'f1000000-0000-0000-0000-000000000003';
      UPDATE public.scholars SET published_revision_id = '01000000-0000-0000-0000-000000000004' WHERE id = 'f1000000-0000-0000-0000-000000000004';
      UPDATE public.scholars SET published_revision_id = '01000000-0000-0000-0000-000000000005' WHERE id = 'f1000000-0000-0000-0000-000000000005';
    `);

    // 5. Insert Scholar Disciplines
    await client.query(`
      INSERT INTO public.scholar_disciplines (scholar_id, discipline_id, is_primary) VALUES
        ('f1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001', true),
        ('f1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000005', false),
        ('f1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000008', true),
        ('f1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000003', false),
        ('f1000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000007', true),
        ('f1000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000006', false)
      ON CONFLICT (scholar_id, discipline_id) DO NOTHING;
    `);

    // 6. Insert Scholar Traditions
    await client.query(`
      INSERT INTO public.scholar_traditions (scholar_id, tradition_id, is_primary) VALUES
        ('f1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003', true),
        ('f1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002', true),
        ('f1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000001', true)
      ON CONFLICT (scholar_id, tradition_id) DO NOTHING;
    `);

    // 7. Insert Scholar Confessions
    await client.query(`
      INSERT INTO public.scholar_confessions (scholar_id, confessional_standard_id, adherence_level, exception_notes) VALUES
        ('f1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000010', 'full_subscription', NULL),
        ('f1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'full_subscription', NULL),
        ('f1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000006', 'full_subscription', NULL),
        ('f1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000012', 'full_subscription', NULL),
        ('f1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000004', 'full_subscription', NULL),
        ('f1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000002', 'full_subscription', NULL)
      ON CONFLICT (scholar_id, confessional_standard_id) DO NOTHING;
    `);

    // 8. Insert Credentials
    await client.query(`
      INSERT INTO public.credentials (scholar_id, degree, field_of_study, institution_name, year_awarded, is_terminal, display_order) VALUES
        ('f1000000-0000-0000-0000-000000000003', 'D.Phil.', 'Hebrew & Semitic Studies', 'University of Oxford', 2012, true, 1),
        ('f1000000-0000-0000-0000-000000000003', 'M.St.', 'Jewish Studies in the Graeco-Roman Period', 'University of Oxford', 2008, false, 2),
        ('f1000000-0000-0000-0000-000000000004', 'Ph.D.', 'Systematic Theology & Apologetics', 'Southern Baptist Theological Seminary', 2016, true, 1),
        ('f1000000-0000-0000-0000-000000000004', 'M.Div.', 'Theology & Biblical Languages', 'Southern Baptist Theological Seminary', 2011, false, 2),
        ('f1000000-0000-0000-0000-000000000005', 'Ph.D.', 'Christian Ethics', 'Princeton Theological Seminary', 2015, true, 1),
        ('f1000000-0000-0000-0000-000000000005', 'Th.M.', 'Historical & Practical Theology', 'Reformed Theological Seminary', 2010, false, 2),
        ('f1000000-0000-0000-0000-000000000005', 'M.Div.', 'Pastoral Ministry', 'Gordon-Conwell Theological Seminary', 2008, false, 3)
      ON CONFLICT DO NOTHING;
    `);

    // 9. Insert Publications
    await client.query(`
      INSERT INTO public.publications (scholar_id, title, publication_type, publisher_or_journal, year, citation_text, display_order) VALUES
        (
          'f1000000-0000-0000-0000-000000000003',
          'Poetics and Theodicy in the Hebrew Psalter',
          'book',
          'Oxford University Press',
          2019,
          'Cranmer-Davies, Thomas. Poetics and Theodicy in the Hebrew Psalter. Oxford: Oxford University Press, 2019.',
          1
        ),
        (
          'f1000000-0000-0000-0000-000000000004',
          'A Presuppositional Defense of Christian Monotheism',
          'book',
          'Crossway',
          2022,
          'Vance, Marcus A. A Presuppositional Defense of Christian Monotheism. Wheaton: Crossway, 2022.',
          1
        ),
        (
          'f1000000-0000-0000-0000-000000000005',
          'Covenant Virtue: Christian Ethics at the End of Life',
          'book',
          'Eerdmans',
          2021,
          'Montgomery-Knox, Elizabeth. Covenant Virtue: Christian Ethics at the End of Life. Grand Rapids: Eerdmans, 2021.',
          1
        )
      ON CONFLICT DO NOTHING;
    `);

    // 10. Insert Courses
    await client.query(`
      INSERT INTO public.courses (
        id, scholar_id, title, slug, description, level, primary_discipline_id,
        delivery_modes, public_preview_enabled, visibility
      ) VALUES
        (
          '02000000-0000-0000-0000-000000000003',
          'f1000000-0000-0000-0000-000000000003',
          'Hebrew Poetry & The Psalms of Lament',
          'hebrew-poetry-psalms-lament',
          'An advanced postgraduate seminar exploring the poetic mechanics, liturgical setting, and theological profundity of lament in the Hebrew Psalter.',
          'graduate',
          'd1000000-0000-0000-0000-000000000001',
          ARRAY['in_person_modular', 'online_sync'],
          true,
          'public'
        ),
        (
          '02000000-0000-0000-0000-000000000004',
          'f1000000-0000-0000-0000-000000000004',
          'Trinitarian Epistemology & Presuppositional Apologetics',
          'trinitarian-epistemology-apologetics',
          'Critique of contemporary naturalism and postmodern skepticism through the lens of Cornelius Van Til and John Frame.',
          'graduate',
          'd1000000-0000-0000-0000-000000000008',
          ARRAY['online_async', 'online_sync'],
          true,
          'public'
        ),
        (
          '02000000-0000-0000-0000-000000000005',
          'f1000000-0000-0000-0000-000000000005',
          'Bioethics & Biomedical Ethics in Christian Pastoral Care',
          'bioethics-pastoral-care',
          'A clinical and biblical exploration of end-of-life decisions, gene editing, reproductive technologies, and Christian palliative care.',
          'graduate',
          'd1000000-0000-0000-0000-000000000007',
          ARRAY['in_person_semester', 'online_sync'],
          true,
          'public'
        )
      ON CONFLICT (scholar_id, slug) DO NOTHING;
    `);

    // 11. Insert Availability Profiles
    await client.query(`
      INSERT INTO public.availability_profiles (
        scholar_id, is_available_for_hire, opportunity_types, preferred_delivery_modes, available_terms, notes,
        travel_preferences, speaking_bio, honorarium_policy
      ) VALUES
        (
          'f1000000-0000-0000-0000-000000000001',
          true,
          ARRAY['adjunct_teaching', 'online_instruction', 'intensives_modular', 'doctoral_supervision', 'conference_speaking', 'guest_lecturing'],
          ARRAY['online_sync', 'in_person_modular'],
          ARRAY['Spring 2027', 'Summer 2027'],
          'Available for 1–2 week modular intensives or online synchronous seminar instruction in Historical Theology.',
          'Available for regional, national, and international academic symposia and church conferences. Prefer flights out of PHL.',
          'Dr. Calvin Edwards is an internationally recognized voice in Post-Reformation Reformed Orthodoxy and Reformed Scholasticism. He has delivered keynotes at the Evangelical Theological Society, World Reformed Fellowship, and numerous pastoral conferences worldwide.',
          'Standard travel, lodging, and an honorarium commensurate with host institution budget. Reduced or waived honoraria considered for church plants and developing nations.'
        ),
        (
          'f1000000-0000-0000-0000-000000000003',
          true,
          ARRAY['adjunct_teaching', 'online_instruction', 'intensives_modular', 'guest_lecturing'],
          ARRAY['online_sync', 'in_person_modular'],
          ARRAY['Spring 2027', 'Summer 2027'],
          'Available for modular intensive Hebrew courses and guest lectures on Old Testament theology.',
          'UK, European, and trans-Atlantic conference lectures.',
          'Dr. Thomas Cranmer-Davies provides scholarly and homiletical expositions of West Semitic philology and the canonical Psalms of Lament for university chapels and pastoral convocations.',
          'Institutional travel reimbursement and standard lecturer honorarium.'
        ),
        (
          'f1000000-0000-0000-0000-000000000004',
          true,
          ARRAY['adjunct_teaching', 'online_instruction', 'conference_speaking', 'intensives_modular'],
          ARRAY['online_async', 'online_sync'],
          ARRAY['Fall 2026', 'Spring 2027'],
          'Available for asynchronous and synchronous apologetics modules, modular intensives, and campus seminars.',
          'Regional and national travel throughout the Southeast and Midwest United States.',
          'Dr. Marcus Aurelius Vance is a dynamic apologist and systematician defending the coherence of Reformed epistemology, biblical inerrancy, and Christian cultural witness.',
          'Standard travel reimbursement and honorarium; church and collegiate discounts available upon request.'
        ),
        (
          'f1000000-0000-0000-0000-000000000005',
          true,
          ARRAY['adjunct_teaching', 'doctoral_supervision', 'curriculum_consulting', 'online_instruction'],
          ARRAY['in_person_semester', 'online_sync'],
          ARRAY['Fall 2026', 'Spring 2027', 'Summer 2027'],
          'Available for semester-length courses in Christian bioethics and doctoral thesis supervision.',
          null,
          null,
          null
        )
      ON CONFLICT (scholar_id) DO UPDATE SET
        opportunity_types = EXCLUDED.opportunity_types,
        preferred_delivery_modes = EXCLUDED.preferred_delivery_modes,
        available_terms = EXCLUDED.available_terms,
        notes = EXCLUDED.notes,
        travel_preferences = EXCLUDED.travel_preferences,
        speaking_bio = EXCLUDED.speaking_bio,
        honorarium_policy = EXCLUDED.honorarium_policy;
    `);


    // 12. Insert Pilot Institution Academic Opportunities / Postings
    await client.query(`
      INSERT INTO public.institution_postings (
        id, institution_id, title, slug, opportunity_type, discipline_id, tradition_id,
        required_degree, delivery_mode, term, description, confessional_requirements,
        compensation_notes, deadline, status
      ) VALUES
        (
          'f1000000-0000-0000-0000-000000000001',
          'e1000000-0000-0000-0000-000000000001',
          'Adjunct Professor in Historical Theology (Reformation Era)',
          'adjunct-prof-historical-theology-wts',
          'adjunct',
          'd1000000-0000-0000-0000-000000000004',
          'b1000000-0000-0000-0000-000000000001',
          'Ph.D. or Th.D. in Historical Theology',
          'online_synchronous',
          'Spring 2027',
          'Westminster Theological Seminary seeks a qualified adjunct professor to teach a master-level seminar on Post-Reformation Scholasticism and the Westminster Standards.',
          'Subscription to the Westminster Confession of Faith and Catechisms (ex animo).',
          '$4,500 per 3-credit course section plus LMS course prep stipend',
          '2026-11-15',
          'published'
        ),
        (
          'f1000000-0000-0000-0000-000000000002',
          'e1000000-0000-0000-0000-000000000002',
          'Modular Intensive Lecturer: Johannine Literature & Christology',
          'modular-lecturer-johannine-christology-rts',
          'modular_intensive',
          'd1000000-0000-0000-0000-000000000002',
          'b1000000-0000-0000-0000-000000000001',
          'Ph.D. in New Testament Studies',
          'in_person',
          'Summer 2027',
          'Reformed Theological Seminary (Orlando) is seeking a guest faculty member for a one-week intensive course on the Gospel of John and high Christology.',
          'Hearty subscription to the historic Reformed confessions (Westminster or Three Forms of Unity).',
          '$5,000 honorarium plus travel, housing, and meal per diem',
          '2026-12-01',
          'published'
        ),
        (
          'f1000000-0000-0000-0000-000000000003',
          'e1000000-0000-0000-0000-000000000003',
          'Assistant Professor of Systematic Theology',
          'assistant-prof-systematic-theology-sbts',
          'full_time_tenure_track',
          'd1000000-0000-0000-0000-000000000003',
          'b1000000-0000-0000-0000-000000000002',
          'Ph.D. in Systematic or Dogmatic Theology',
          'in_person',
          'Academic Year 2027–2028',
          'The Southern Baptist Theological Seminary invites applications for a full-time tenure-track faculty appointment in Christian Theology.',
          'Full agreement with the Baptist Faith and Message 2000 and the Abstract of Principles.',
          'Competitive academic salary with comprehensive retirement and health benefits',
          '2027-01-15',
          'published'
        )
      ON CONFLICT (slug) DO NOTHING;
    `);

    // 13. Insert Pilot Authoritative Institutional Endorsements
    await client.query(`
      INSERT INTO public.institution_endorsements (
        id, institution_id, scholar_id, relationship_type, department_or_field,
        endorsement_text, is_credential_verified, status
      ) VALUES
        (
          'b3000000-0000-0000-0000-000000000001',
          'e1000000-0000-0000-0000-000000000001',
          'f1000000-0000-0000-0000-000000000001',
          'Former Faculty',
          'Historical Theology',
          'Dr. Calvin Edwards served on our visiting faculty in Historical Theology with exceptional pedagogical rigor and unswerving confessional commitment to Reformed dogmatics.',
          true,
          'active'
        ),
        (
          'b3000000-0000-0000-0000-000000000002',
          'e1000000-0000-0000-0000-000000000002',
          'f1000000-0000-0000-0000-000000000002',
          'Visiting Scholar',
          'New Testament Studies',
          'Dr. Sarah MacArthur demonstrated scholarly command and exemplary teaching excellence in our master of divinity exegetical seminars.',
          true,
          'active'
        )
      ON CONFLICT (id) DO NOTHING;
    `);

    // 14. Insert Speaker Topics (Speaking Bureau)
    await client.query(`
      INSERT INTO public.speaker_topics (
        id, scholar_id, title, description, target_audience, sample_media_url, display_order, is_featured
      ) VALUES
        (
          'a5000000-0000-0000-0000-000000000001',
          'f1000000-0000-0000-0000-000000000001',
          'The Architecture of Federal Theology: Covenant and Christ in 17th-Century Reformed Orthodoxy',
          'A deep examination of the historical and theological development of the covenant of works and covenant of grace among Post-Reformation scholastic dogmaticians, with implications for contemporary confessional identity.',
          'academic',
          'https://youtube.com/watch?v=sample-edwards-covenant',
          1,
          true
        ),
        (
          'a5000000-0000-0000-0000-000000000002',
          'f1000000-0000-0000-0000-000000000001',
          'Holding the Line: Confessional Fidelity in Pastoral Ministry',
          'Practical lessons from historic Reformed pastors on pastoral stamina, catechism, doctrinal fortitude, and shepherding souls through theological controversy.',
          'pastoral',
          'https://vimeo.com/sample-edwards-pastoral',
          2,
          false
        ),
        (
          'a5000000-0000-0000-0000-000000000003',
          'f1000000-0000-0000-0000-000000000004',
          'Reason, Revelation, and the Radical Gospel: Presuppositional Apologetics on the Secular Campus',
          'Equipping undergraduate students, campus ministers, and young adults to address modern skepticism through a presuppositional apologetic rooted in the epistemic primacy of Christ.',
          'undergraduate',
          'https://youtube.com/watch?v=sample-vance-apologetics',
          1,
          true
        ),
        (
          'a5000000-0000-0000-0000-000000000004',
          'f1000000-0000-0000-0000-000000000004',
          'Why the World Needs Christian Conviction: Defending Faith in the Public Square',
          'An accessible, engaging lecture for local congregations on engaging contemporary cultural narratives with courage, clarity, and Christian love.',
          'church_wide',
          NULL,
          2,
          true
        ),
        (
          'a5000000-0000-0000-0000-000000000005',
          'f1000000-0000-0000-0000-000000000003',
          'Praying the Deepest Sorrows: The Hebrew Psalms of Lament for the Hurting Church',
          'Expository lecture on West Semitic poetic parallelism, the anatomy of grief in the Psalter, and theological care for suffering saints.',
          'pastoral',
          NULL,
          1,
          false
        )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        target_audience = EXCLUDED.target_audience,
        sample_media_url = EXCLUDED.sample_media_url,
        display_order = EXCLUDED.display_order,
        is_featured = EXCLUDED.is_featured;
    `);

    // 15. Insert Tiered Institutional Subscriptions (ADR 0010)
    await client.query(`
      INSERT INTO public.institution_subscriptions (
        id, institution_id, tier, billing_cycle, status, seats_limit, monthly_inquiry_limit, inquiries_used_current_month
      ) VALUES
        (
          'b7000000-0000-0000-0000-000000000001',
          'e1000000-0000-0000-0000-000000000001', -- Westminster
          'premier_partner',
          'annual',
          'active',
          10,
          99999,
          2
        ),
        (
          'b7000000-0000-0000-0000-000000000002',
          'e1000000-0000-0000-0000-000000000002', -- RTS
          'verified_seminary',
          'annual',
          'active',
          3,
          25,
          1
        ),
        (
          'b7000000-0000-0000-0000-000000000003',
          'e1000000-0000-0000-0000-000000000003', -- SBTS
          'verified_seminary',
          'monthly',
          'active',
          3,
          25,
          0
        ),
        (
          'b7000000-0000-0000-0000-000000000004',
          'e1000000-0000-0000-0000-000000000004', -- TEDS
          'basic',
          'monthly',
          'active',
          1,
          5,
          0
        )
      ON CONFLICT (institution_id) DO UPDATE SET
        tier = EXCLUDED.tier,
        billing_cycle = EXCLUDED.billing_cycle,
        status = EXCLUDED.status,
        seats_limit = EXCLUDED.seats_limit,
        monthly_inquiry_limit = EXCLUDED.monthly_inquiry_limit;
    `);

    // 16. Insert Institutional Engagement Contracts (ADR 0011)
    await client.query(`
      INSERT INTO public.institution_contracts (
        id, institution_id, scholar_id, opportunity_type, title, scope_of_work,
        start_date, end_date, total_compensation_amount, currency, payment_terms, status, created_by
      ) VALUES
        (
          'c7000000-0000-0000-0000-000000000001',
          'e1000000-0000-0000-0000-000000000001', -- Westminster
          'f1000000-0000-0000-0000-000000000001', -- Dr. Calvin Edwards
          'modular_intensive',
          'Post-Reformation Reformed Scholasticism & Federal Theology Doctoral Seminar',
          'One-week residential modular doctoral seminar (ThM/PhD) in Glenside, PA, including 30 hours of instructional seminar sessions, syllabus preparation, reading list curation, and grading of 8 seminar papers.',
          '2026-10-15',
          '2026-10-22',
          6500.00,
          'USD',
          'Net 30 days upon milestone completion; travel reimbursement up to $800 upon receipt submission.',
          'offered',
          'a1000000-0000-0000-0000-000000000004' -- recruiter@wts.edu
        ),
        (
          'c7000000-0000-0000-0000-000000000002',
          'e1000000-0000-0000-0000-000000000002', -- RTS
          'f1000000-0000-0000-0000-000000000004', -- Dr. Marcus Vance
          'speaking_engagement',
          'Annual Bavinck Lectures on Epistemology & Christian Apologetics',
          'Three-part keynote lecture series on Christian Epistemology and Presuppositional Apologetics at RTS Orlando chapel and evening symposium, including moderated panel discussion.',
          '2026-11-05',
          '2026-11-07',
          3500.00,
          'USD',
          'Full honorarium disbursed upon conclusion of keynote series; lodging provided at seminary guest suite.',
          'accepted',
          'a1000000-0000-0000-0000-000000000001'
        )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        scope_of_work = EXCLUDED.scope_of_work,
        status = EXCLUDED.status,
        total_compensation_amount = EXCLUDED.total_compensation_amount;
    `);

    // 17. Insert Contract Milestones (ADR 0011)
    await client.query(`
      INSERT INTO public.contract_milestones (
        id, contract_id, title, description, due_date, compensation_amount, status, display_order, completed_at
      ) VALUES
        (
          'd7000000-0000-0000-0000-000000000001',
          'c7000000-0000-0000-0000-000000000001',
          'Syllabus & Reading List Finalization',
          'Deliver final syllabus with primary source reading assignments and discussion questions.',
          '2026-09-30',
          1500.00,
          'verified',
          1,
          now()
        ),
        (
          'd7000000-0000-0000-0000-000000000002',
          'c7000000-0000-0000-0000-000000000001',
          'Conduct 30-Hour Modular Seminar Instruction',
          'Deliver residential doctoral lectures and seminars on campus in Glenside, PA.',
          '2026-10-22',
          3500.00,
          'pending',
          2,
          NULL
        ),
        (
          'd7000000-0000-0000-0000-000000000003',
          'c7000000-0000-0000-0000-000000000001',
          'Grading & Evaluative Rubrics Submission',
          'Submit final grades and qualitative feedback for all doctoral seminar papers.',
          '2026-11-15',
          1500.00,
          'pending',
          3,
          NULL
        ),
        (
          'd7000000-0000-0000-0000-000000000004',
          'c7000000-0000-0000-0000-000000000002',
          'Keynote Manuscript & Outline Submission',
          'Submit manuscripts and slides for three Bavinck keynote lectures.',
          '2026-10-20',
          1000.00,
          'verified',
          1,
          now()
        ),
        (
          'd7000000-0000-0000-0000-000000000005',
          'c7000000-0000-0000-0000-000000000002',
          'Delivery of 3 Keynote Lectures and Moderated Panel',
          'Deliver keynote addresses at RTS Orlando chapel and evening symposium.',
          '2026-11-07',
          2500.00,
          'pending',
          2,
          NULL
        )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        compensation_amount = EXCLUDED.compensation_amount,
        status = EXCLUDED.status;
    `);

    // 18. Insert Seminary Consortia & Multi-Campus System Accounts (ADR 0012)
    await client.query(`
      INSERT INTO public.consortiums (
        id, name, slug, description, website, lead_institution_id
      ) VALUES
        (
          'c8000000-0000-0000-0000-000000000001',
          'Association of Reformed Theological Seminaries (ARTS)',
          'association-of-reformed-theological-seminaries',
          'A dedicated academic consortium of confessional Reformed seminaries cooperating in graduate theological education, cross-campus visiting faculty appointments, and shared curricular resources.',
          'https://artseminaries.org',
          'e1000000-0000-0000-0000-000000000001' -- Westminster Theological Seminary
        )
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        website = EXCLUDED.website;

      INSERT INTO public.consortium_members (
        id, consortium_id, institution_id, role, status
      ) VALUES
        (
          'e8000000-0000-0000-0000-000000000001',
          'c8000000-0000-0000-0000-000000000001',
          'e1000000-0000-0000-0000-000000000001', -- Westminster
          'lead',
          'active'
        ),
        (
          'e8000000-0000-0000-0000-000000000002',
          'c8000000-0000-0000-0000-000000000001',
          'e1000000-0000-0000-0000-000000000002', -- RTS
          'member',
          'active'
        ),
        (
          'e8000000-0000-0000-0000-000000000003',
          'c8000000-0000-0000-0000-000000000001',
          'e1000000-0000-0000-0000-000000000003', -- SBTS
          'affiliate',
          'active'
        )
      ON CONFLICT (consortium_id, institution_id) DO UPDATE SET
        role = EXCLUDED.role,
        status = EXCLUDED.status;
    `);

    // 19. Ensure Institutional Accreditation & Insert Course Licensing Agreements (ADR 0013)
    await client.query(`
      UPDATE public.institutions
      SET accreditation_body = 'ATS', accreditation_status = 'accredited', accreditation_verified_at = now() - interval '180 days'
      WHERE slug = 'westminster-theological-seminary';

      UPDATE public.institutions
      SET accreditation_body = 'ATS', accreditation_status = 'accredited', accreditation_verified_at = now() - interval '150 days'
      WHERE slug = 'reformed-theological-seminary';

      UPDATE public.institutions
      SET accreditation_body = 'ATS', accreditation_status = 'accredited', accreditation_verified_at = now() - interval '200 days'
      WHERE slug = 'sbts';

      UPDATE public.institutions
      SET accreditation_body = 'ATS', accreditation_status = 'accredited', accreditation_verified_at = now() - interval '120 days'
      WHERE slug = 'teds';

      INSERT INTO public.course_licensing_agreements (
        id, course_id, scholar_id, institution_id, consortium_id,
        license_type, term_duration, royalty_amount, permitted_students_count,
        status, custom_terms, signed_by_scholar_at, signed_by_institution_at
      ) VALUES
        (
          '05000000-0000-0000-0000-000000000001',
          '02000000-0000-0000-0000-000000000002', -- Johannine Exegesis
          'f1000000-0000-0000-0000-000000000002', -- Dr. Sarah MacArthur
          'e1000000-0000-0000-0000-000000000001', -- Westminster
          'c8000000-0000-0000-0000-000000000001', -- ARTS Consortium
          'full_course_curriculum',
          '1_academic_year',
          3500.00,
          30,
          'active',
          'Includes 12 lecture outlines, Greek parsing reading guides, and 3 guest modular Q&A seminars.',
          now() - interval '10 days',
          now() - interval '10 days'
        ),
        (
          '05000000-0000-0000-0000-000000000002',
          '02000000-0000-0000-0000-000000000001', -- Post-Reformation Scholasticism
          'f1000000-0000-0000-0000-000000000001', -- Dr. Calvin Edwards
          'e1000000-0000-0000-0000-000000000002', -- Reformed Theological Seminary
          NULL,
          'syllabus_only',
          '1_semester',
          850.00,
          20,
          'requested',
          'Syllabus and bibliography adoption for upcoming Master of Divinity intensive cohort.',
          NULL,
          now() - interval '2 days'
        )
      ON CONFLICT (id) DO UPDATE SET
        license_type = EXCLUDED.license_type,
        term_duration = EXCLUDED.term_duration,
        royalty_amount = EXCLUDED.royalty_amount,
        permitted_students_count = EXCLUDED.permitted_students_count,
        status = EXCLUDED.status,
        custom_terms = EXCLUDED.custom_terms,
        signed_by_scholar_at = EXCLUDED.signed_by_scholar_at,
        signed_by_institution_at = EXCLUDED.signed_by_institution_at;
    `);

    // 16. Seed Distinguished Scholar Dossier & Media Showcase (ADR 0014)
    await client.query(`
      UPDATE public.scholars
      SET profile_tier = 'distinguished_fellow',
          orcid_id = '0000-0002-1825-0097',
          google_scholar_url = 'https://scholar.google.com/citations?user=calvin-edwards'
      WHERE id = 'f1000000-0000-0000-0000-000000000001';

      INSERT INTO public.media_links (
        id, scholar_id, course_id, media_type, url, title, description, display_order, is_featured, duration_seconds
      ) VALUES
        (
          'c2000000-0000-0000-0000-000000000001',
          'f1000000-0000-0000-0000-000000000001',
          '02000000-0000-0000-0000-000000000001',
          'youtube_video',
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          'The Federal Principle in 17th Century Reformed Dogmatics',
          'Plenary inaugural lecture delivered at the Westminster Theological Conference on Post-Reformation Scholasticism.',
          1,
          true,
          3240
        ),
        (
          'c2000000-0000-0000-0000-000000000002',
          'f1000000-0000-0000-0000-000000000001',
          NULL,
          'vimeo_video',
          'https://vimeo.com/76979871',
          'Francis Turretin and the Latin Disputation Tradition',
          'Doctoral seminar masterclass reviewing scholastic methodology and theological definitions.',
          2,
          false,
          2700
        ),
        (
          'c2000000-0000-0000-0000-000000000003',
          'f1000000-0000-0000-0000-000000000001',
          NULL,
          'podcast',
          'https://open.spotify.com/episode/7G0K9lKkL8F8N0e3gX5Y9Z',
          'The Covenant of Works and Historic Presbyterianism',
          'Theology roundtable discussion on the Westminster Standards and contemporary debates in Reformed dogmatics.',
          3,
          false,
          3600
        )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        url = EXCLUDED.url,
        media_type = EXCLUDED.media_type,
        description = EXCLUDED.description,
        is_featured = EXCLUDED.is_featured,
        duration_seconds = EXCLUDED.duration_seconds;

      -- 14. Seed Reference Inquiries and Common App Applications (ADR 0020)
      INSERT INTO public.inquiries (
        id, institution_id, scholar_id, sender_account_id, opportunity_type,
        proposed_term, delivery_mode, message, contact_email, status, created_at
      ) VALUES
        (
          '11000000-0000-0000-0000-000000000001',
          'e1000000-0000-0000-0000-000000000001',
          'f1000000-0000-0000-0000-000000000003',
          'a1000000-0000-0000-0000-000000000005',
          'adjunct',
          'Spring 2027',
          'online_synchronous',
          '[Common App for Posting: Adjunct Professor in Historical Theology (Reformation Era) (f1000000-0000-0000-0000-000000000001)]\n\nI am pleased to submit my Common Application for the Adjunct Professor in Historical Theology position. My doctoral research and 15 years of postgraduate teaching in post-Reformation scholasticism align closely with the curriculum needs of Westminster Theological Seminary. I subscribe ex animo to the Westminster Standards.',
          'dr.thomas.cranmer@faithfullscholars.org',
          'pending',
          now() - interval '2 days'
        ),
        (
          '11000000-0000-0000-0000-000000000002',
          'e1000000-0000-0000-0000-000000000001',
          'f1000000-0000-0000-0000-000000000004',
          'a1000000-0000-0000-0000-000000000006',
          'adjunct',
          'Spring 2027',
          'online_synchronous',
          '[Common App for Posting: Adjunct Professor in Historical Theology (Reformation Era) (f1000000-0000-0000-0000-000000000001)]\n\nEnclosing my candidate dossier for consideration in the Spring 2027 modular intensive. I hold a Ph.D. in Systematic Theology and have taught historical dogmatics and covenant theology for over a decade.',
          'dr.marcus.vance@faithfullscholars.org',
          'accepted',
          now() - interval '4 days'
        )
      ON CONFLICT (id) DO UPDATE SET
        message = EXCLUDED.message,
        status = EXCLUDED.status;
    `);

    await client.query('COMMIT;');
    console.log('✅ Successfully seeded reference scholars, postings, and institutional endorsements into pilot cohort!\n');
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('❌ Failed to seed pilot cohort:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run directly if executed as script
if (require.main === module || process.argv[1]?.endsWith('seed-pilot-cohort.ts')) {
  seedPilotCohort();
}
