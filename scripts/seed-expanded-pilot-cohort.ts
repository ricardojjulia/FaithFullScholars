/**
 * ==============================================================================
 * FaithFull Scholars — Expanded Pilot Cohort Seed Script (Track A)
 * Populates 9 additional diverse, high-caliber theological faculty across:
 * - Old & New Testament, Historical Theology, Ethics, Apologetics,
 * - Biblical Counseling, Missiology, Homiletics, and Biblical Languages.
 *
 * Usage: npx tsx scripts/seed-expanded-pilot-cohort.ts
 * ==============================================================================
 */

import { Client } from 'pg';

const dbUrl =
  process.env.DATABASE_URL ||
  process.env.DB_URL ||
  'postgresql://postgres:postgres@127.0.0.1:49322/postgres';

export async function seedExpandedPilotCohort() {
  console.log('\n============================================================');
  console.log('   FaithFull Scholars — Seeding Expanded Pilot Cohort (Track A)');
  console.log('============================================================\n');

  const client = new Client({ connectionString: dbUrl });

  try {
    await client.connect();
    console.log(`Connected to database at ${dbUrl.replace(/:[^:@]+@/, ':***@')}\n`);

    await client.query('BEGIN;');

    // 1. Auth Users
    await client.query(`
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) VALUES
        ('a1000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.jonathan.owen@faithfullscholars.org', '', now(), '{"provider":"email"}', '{}', now(), now()),
        ('a1000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.athanasius.machen@faithfullscholars.org', '', now(), '{"provider":"email"}', '{}', now(), now()),
        ('a1000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.priscilla.vantil@faithfullscholars.org', '', now(), '{"provider":"email"}', '{}', now(), now()),
        ('a1000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.augustine.bavinck@faithfullscholars.org', '', now(), '{"provider":"email"}', '{}', now(), now()),
        ('a1000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.herman.ridderbos@faithfullscholars.org', '', now(), '{"provider":"email"}', '{}', now(), now()),
        ('a1000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.samuel.zwemer@faithfullscholars.org', '', now(), '{"provider":"email"}', '{}', now(), now()),
        ('a1000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.kenneth.bailey@faithfullscholars.org', '', now(), '{"provider":"email"}', '{}', now(), now()),
        ('a1000000-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.dorothy.spurgeon@faithfullscholars.org', '', now(), '{"provider":"email"}', '{}', now(), now()),
        ('a1000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.cornelius.carson@faithfullscholars.org', '', now(), '{"provider":"email"}', '{}', now(), now())
      ON CONFLICT (id) DO NOTHING;
    `);

    // 2. Accounts
    await client.query(`
      INSERT INTO public.accounts (id, email, role) VALUES
        ('a1000000-0000-0000-0000-000000000008', 'dr.jonathan.owen@faithfullscholars.org', 'scholar'),
        ('a1000000-0000-0000-0000-000000000009', 'dr.athanasius.machen@faithfullscholars.org', 'scholar'),
        ('a1000000-0000-0000-0000-00000000000a', 'dr.priscilla.vantil@faithfullscholars.org', 'scholar'),
        ('a1000000-0000-0000-0000-00000000000b', 'dr.augustine.bavinck@faithfullscholars.org', 'scholar'),
        ('a1000000-0000-0000-0000-00000000000c', 'dr.herman.ridderbos@faithfullscholars.org', 'scholar'),
        ('a1000000-0000-0000-0000-00000000000d', 'dr.samuel.zwemer@faithfullscholars.org', 'scholar'),
        ('a1000000-0000-0000-0000-00000000000e', 'dr.kenneth.bailey@faithfullscholars.org', 'scholar'),
        ('a1000000-0000-0000-0000-00000000000f', 'dr.dorothy.spurgeon@faithfullscholars.org', 'scholar'),
        ('a1000000-0000-0000-0000-000000000010', 'dr.cornelius.carson@faithfullscholars.org', 'scholar')
      ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role;
    `);

    // 3. Scholars
    await client.query(`
      INSERT INTO public.scholars (
        id, account_id, slug, full_name, title, current_institution, institutional_role,
        biography, location, timezone, contact_preference, profile_status, verification_status,
        doctrinal_statement_text
      ) VALUES
        (
          'f1000000-0000-0000-0000-000000000006',
          'a1000000-0000-0000-0000-000000000008',
          'jonathan-edwards-owen',
          'Dr. Jonathan Edwards-Owen',
          'Professor of Historical Theology & Puritan Studies',
          'Westminster Theological Seminary',
          'Professor of Church History',
          'Specialist in Post-Reformation Reformed dogmatics, English Puritan covenant theology, and Jonathan Edwards pneumatology. Published author of 4 monographs on seventeenth-century Reformed scholasticism.',
          'Philadelphia, PA',
          'America/New_York',
          'institution_inquiry',
          'approved',
          'verified',
          'I subscribe unconditionally to the Westminster Confession of Faith and Catechisms (1646/47).'
        ),
        (
          'f1000000-0000-0000-0000-000000000007',
          'a1000000-0000-0000-0000-000000000009',
          'athanasius-gresham-machen',
          'Dr. Athanasius Gresham Machen',
          'Professor of New Testament & Pauline Epistles',
          'Gordon-Conwell Theological Seminary',
          'Senior Lecturer in Pauline Exegesis',
          'Specialist in Pauline theology, justification by faith in Galatians and Romans, and first-century Hellenistic Greek syntax. Over 20 years teaching intermediate and advanced Greek exegesis.',
          'South Hamilton, MA',
          'America/New_York',
          'institution_inquiry',
          'approved',
          'verified',
          'I affirm the historic Nicene-Constantinopolitan Creed and the Lausanne Covenant with full commitment.'
        ),
        (
          'f1000000-0000-0000-0000-000000000008',
          'a1000000-0000-0000-0000-00000000000a',
          'priscilla-cornelia-vantil',
          'Dr. Priscilla Cornelia Van Til',
          'Associate Professor of Biblical Counseling & Pastoral Theology',
          'Christian Counseling & Educational Foundation',
          'Director of Advanced Practicum',
          'Expertise in Christ-centered pastoral care, biblical counseling for trauma, and the pastoral integration of theology and mental health care in the local church.',
          'Glenside, PA',
          'America/New_York',
          'institution_inquiry',
          'approved',
          'verified',
          'I gladly affirm the Westminster Standards and the absolute sufficiency of Holy Scripture for faith and life.'
        ),
        (
          'f1000000-0000-0000-0000-000000000009',
          'a1000000-0000-0000-0000-00000000000b',
          'augustine-herman-bavinck',
          'Dr. Augustine Herman Bavinck',
          'Professor of Dogmatic & Systematic Theology',
          'Calvin Theological Seminary',
          'Chair of Dogmatic Theology',
          'Focusing on theological prolegomena, Neo-Calvinist organic worldview, general and special revelation, and the Trinity in contemporary theological discourse.',
          'Grand Rapids, MI',
          'America/Detroit',
          'institution_inquiry',
          'approved',
          'verified',
          'I affirm the Three Forms of Unity (Heidelberg Catechism, Belgic Confession, and Canons of Dort).'
        ),
        (
          'f1000000-0000-0000-0000-00000000000a',
          'a1000000-0000-0000-0000-00000000000c',
          'herman-ridderbos-lee',
          'Dr. Herman Ridderbos-Lee',
          'Associate Professor of Biblical Theology & Hermeneutics',
          'Mid-America Reformed Seminary',
          'Associate Professor of New Testament',
          'Research in kingdom of God eschatology, redemptive-historical hermeneutics, and the theological coherence between Old and New Testaments.',
          'Dyer, IN',
          'America/Chicago',
          'institution_inquiry',
          'approved',
          'verified',
          'I fully subscribe to the Belgic Confession and the Heidelberg Catechism.'
        ),
        (
          'f1000000-0000-0000-0000-00000000000b',
          'a1000000-0000-0000-0000-00000000000d',
          'samuel-zwemer-martyn',
          'Dr. Samuel Zwemer-Martyn',
          'Professor of Missiology & Intercultural Studies',
          'Biola University Talbot School of Theology',
          'Professor of Intercultural Studies',
          'Veteran missiologist with 22 years of field experience in North Africa and Middle East. Author of foundational texts on contextualization, Islamic theology engagement, and global church expansion.',
          'La Mirada, CA',
          'America/Los_Angeles',
          'institution_inquiry',
          'approved',
          'verified',
          'I subscribe to the Lausanne Covenant and the Chicago Statement on Biblical Inerrancy.'
        ),
        (
          'f1000000-0000-0000-0000-00000000000c',
          'a1000000-0000-0000-0000-00000000000e',
          'kenneth-bailey-nassif',
          'Dr. Kenneth Bailey-Nassif',
          'Visiting Professor of Middle Eastern New Testament Backgrounds',
          'Reformed Theological Seminary Orlando',
          'Visiting Lecturer in Synoptics',
          'Expertise in Middle Eastern peasant cultural context, peasant oral tradition, and the parables of Jesus through Middle Eastern eyes.',
          'Orlando, FL',
          'America/New_York',
          'institution_inquiry',
          'approved',
          'verified',
          'I affirm the Apostles and Nicene Creeds and the historic Reformed confessions.'
        ),
        (
          'f1000000-0000-0000-0000-00000000000d',
          'a1000000-0000-0000-0000-00000000000f',
          'dorothy-sayers-spurgeon',
          'Dr. Dorothy Sayers-Spurgeon',
          'Professor of Christian Homiletics & Classical Rhetoric',
          'Beeson Divinity School',
          'Chair of Expository Preaching',
          'Specialist in Christ-centered expository preaching, classical rhetoric in the pulpit, and the theological aesthetics of preaching. Frequent speaker at pastoral conferences.',
          'Birmingham, AL',
          'America/Chicago',
          'institution_inquiry',
          'approved',
          'verified',
          'I affirm the Second London Baptist Confession of Faith (1689) and the Nicene Creed.'
        ),
        (
          'f1000000-0000-0000-0000-00000000000e',
          'a1000000-0000-0000-0000-000000000010',
          'cornelius-da-carson',
          'Dr. Cornelius D. A. Carson',
          'Distinguished Research Professor of New Testament',
          'Trinity Evangelical Divinity School',
          'Research Professor of Greek & Johannine Studies',
          'Renowned commentator on John, 1-3 John, Revelation, and biblical theology of suffering. Extensive publications on Greek grammar and evangelical hermeneutics.',
          'Deerfield, IL',
          'America/Chicago',
          'institution_inquiry',
          'approved',
          'verified',
          'I affirm the inerrancy, infallible truth, and total supreme authority of the Holy Scriptures.'
        )
      ON CONFLICT (slug) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        title = EXCLUDED.title,
        biography = EXCLUDED.biography,
        profile_status = 'approved',
        verification_status = 'verified';
    `);

    // 4. Disciplines
    await client.query(`
      INSERT INTO public.scholar_disciplines (scholar_id, discipline_id, is_primary) VALUES
        ('f1000000-0000-0000-0000-000000000006', 'd1000000-0000-0000-0000-000000000004', true),
        ('f1000000-0000-0000-0000-000000000006', 'd1000000-0000-0000-0000-000000000003', false),
        ('f1000000-0000-0000-0000-000000000007', 'd1000000-0000-0000-0000-000000000002', true),
        ('f1000000-0000-0000-0000-000000000007', 'd1000000-0000-0000-0000-000000000005', false),
        ('f1000000-0000-0000-0000-000000000008', 'd1000000-0000-0000-0000-000000000006', true),
        ('f1000000-0000-0000-0000-000000000008', 'd1000000-0000-0000-0000-000000000007', false),
        ('f1000000-0000-0000-0000-000000000009', 'd1000000-0000-0000-0000-000000000003', true),
        ('f1000000-0000-0000-0000-000000000009', 'd1000000-0000-0000-0000-000000000004', false),
        ('f1000000-0000-0000-0000-00000000000a', 'd1000000-0000-0000-0000-000000000002', true),
        ('f1000000-0000-0000-0000-00000000000a', 'd1000000-0000-0000-0000-000000000001', false),
        ('f1000000-0000-0000-0000-00000000000b', 'd1000000-0000-0000-0000-000000000009', true),
        ('f1000000-0000-0000-0000-00000000000b', 'd1000000-0000-0000-0000-000000000008', false),
        ('f1000000-0000-0000-0000-00000000000c', 'd1000000-0000-0000-0000-000000000002', true),
        ('f1000000-0000-0000-0000-00000000000c', 'd1000000-0000-0000-0000-000000000005', false),
        ('f1000000-0000-0000-0000-00000000000d', 'd1000000-0000-0000-0000-000000000006', true),
        ('f1000000-0000-0000-0000-00000000000d', 'd1000000-0000-0000-0000-000000000003', false),
        ('f1000000-0000-0000-0000-00000000000e', 'd1000000-0000-0000-0000-000000000002', true),
        ('f1000000-0000-0000-0000-00000000000e', 'd1000000-0000-0000-0000-000000000005', false)
      ON CONFLICT (scholar_id, discipline_id) DO NOTHING;
    `);

    // 5. Traditions
    await client.query(`
      INSERT INTO public.scholar_traditions (scholar_id, tradition_id, is_primary) VALUES
        ('f1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000001', true),
        ('f1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000001', true),
        ('f1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000001', true),
        ('f1000000-0000-0000-0000-000000000009', 'b1000000-0000-0000-0000-000000000001', true),
        ('f1000000-0000-0000-0000-00000000000a', 'b1000000-0000-0000-0000-000000000001', true),
        ('f1000000-0000-0000-0000-00000000000b', 'b1000000-0000-0000-0000-000000000006', true),
        ('f1000000-0000-0000-0000-00000000000c', 'b1000000-0000-0000-0000-000000000001', true),
        ('f1000000-0000-0000-0000-00000000000d', 'b1000000-0000-0000-0000-000000000002', true),
        ('f1000000-0000-0000-0000-00000000000e', 'b1000000-0000-0000-0000-000000000006', true)
      ON CONFLICT (scholar_id, tradition_id) DO NOTHING;
    `);

    // 6. Confessional Standards
    await client.query(`
      INSERT INTO public.scholar_confessions (scholar_id, confessional_standard_id, adherence_level) VALUES
        ('f1000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000004', 'full_subscription'),
        ('f1000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000001', 'full_subscription'),
        ('f1000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000004', 'full_subscription'),
        ('f1000000-0000-0000-0000-000000000009', 'c1000000-0000-0000-0000-000000000007', 'full_subscription'),
        ('f1000000-0000-0000-0000-00000000000a', 'c1000000-0000-0000-0000-000000000008', 'full_subscription'),
        ('f1000000-0000-0000-0000-00000000000b', 'c1000000-0000-0000-0000-000000000012', 'full_subscription'),
        ('f1000000-0000-0000-0000-00000000000c', 'c1000000-0000-0000-0000-000000000001', 'full_subscription'),
        ('f1000000-0000-0000-0000-00000000000d', 'c1000000-0000-0000-0000-000000000006', 'full_subscription'),
        ('f1000000-0000-0000-0000-00000000000e', 'c1000000-0000-0000-0000-000000000012', 'full_subscription')
      ON CONFLICT (scholar_id, confessional_standard_id) DO NOTHING;
    `);

    // 7. Credentials (explicit IDs)
    await client.query(`
      INSERT INTO public.credentials (id, scholar_id, degree, field_of_study, institution_name, year_awarded, is_terminal, display_order) VALUES
        ('c2000000-0000-0000-0000-000000000008', 'f1000000-0000-0000-0000-000000000006', 'Ph.D.', 'Religious Studies & Historical Theology', 'Yale University', 2011, true, 1),
        ('c2000000-0000-0000-0000-000000000009', 'f1000000-0000-0000-0000-000000000006', 'M.Div.', 'Theology', 'Westminster Theological Seminary', 2006, false, 2),
        ('c2000000-0000-0000-0000-00000000000a', 'f1000000-0000-0000-0000-000000000007', 'Ph.D.', 'New Testament Studies', 'University of Cambridge', 2009, true, 1),
        ('c2000000-0000-0000-0000-00000000000b', 'f1000000-0000-0000-0000-000000000007', 'Th.M.', 'New Testament Exegesis', 'Gordon-Conwell Theological Seminary', 2004, false, 2),
        ('c2000000-0000-0000-0000-00000000000c', 'f1000000-0000-0000-0000-000000000008', 'Ph.D.', 'Clinical Counseling & Pastoral Theology', 'University of Pennsylvania', 2014, true, 1),
        ('c2000000-0000-0000-0000-00000000000d', 'f1000000-0000-0000-0000-000000000008', 'M.A.', 'Biblical Counseling', 'Westminster Theological Seminary', 2009, false, 2),
        ('c2000000-0000-0000-0000-00000000000e', 'f1000000-0000-0000-0000-000000000009', 'Ph.D.', 'Dogmatic Theology', 'Free University of Amsterdam', 2010, true, 1),
        ('c2000000-0000-0000-0000-00000000000f', 'f1000000-0000-0000-0000-00000000000a', 'Ph.D.', 'New Testament Hermeneutics', 'University of Aberdeen', 2013, true, 1),
        ('c2000000-0000-0000-0000-000000000010', 'f1000000-0000-0000-0000-00000000000b', 'Ph.D.', 'Intercultural Studies & Missiology', 'Fuller Theological Seminary', 2007, true, 1),
        ('c2000000-0000-0000-0000-000000000011', 'f1000000-0000-0000-0000-00000000000c', 'Ph.D.', 'Middle Eastern Studies & Early Christian Literature', 'University of Manchester', 2012, true, 1),
        ('c2000000-0000-0000-0000-000000000012', 'f1000000-0000-0000-0000-00000000000d', 'Ph.D.', 'Rhetoric & Homiletics', 'University of St Andrews', 2015, true, 1),
        ('c2000000-0000-0000-0000-000000000013', 'f1000000-0000-0000-0000-00000000000e', 'Ph.D.', 'New Testament Exegesis & Johannine Literature', 'University of Oxford', 2005, true, 1)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 8. Publications (explicit IDs)
    await client.query(`
      INSERT INTO public.publications (id, scholar_id, title, publication_type, publisher_or_journal, year, citation_text, display_order) VALUES
        ('03000000-0000-0000-0000-000000000006', 'f1000000-0000-0000-0000-000000000006', 'The Puritan Doctrine of Assurance: John Owen on Holy Spirit and Heart Renewal', 'book', 'Oxford University Press', 2018, 'Edwards-Owen, Jonathan. The Puritan Doctrine of Assurance. Oxford: OUP, 2018.', 1),
        ('03000000-0000-0000-0000-000000000007', 'f1000000-0000-0000-0000-000000000007', 'Paul and the Faith of Christ: Exegesis and Apocalyptic Perspective in Galatians', 'book', 'Baker Academic', 2020, 'Machen, Athanasius G. Paul and the Faith of Christ. Grand Rapids: Baker Academic, 2020.', 1),
        ('03000000-0000-0000-0000-000000000008', 'f1000000-0000-0000-0000-000000000008', 'Suffering and Sancitification: A Biblical Model for Trauma-Informed Pastoral Care', 'book', 'Crossway', 2022, 'Van Til, Priscilla C. Suffering and Sanctification. Wheaton: Crossway, 2022.', 1),
        ('03000000-0000-0000-0000-000000000009', 'f1000000-0000-0000-0000-000000000009', 'The Organic Word: Dogmatic Prolegomena in the Postmodern Era', 'book', 'Eerdmans', 2021, 'Bavinck, Augustine H. The Organic Word. Grand Rapids: Eerdmans, 2021.', 1),
        ('03000000-0000-0000-0000-00000000000a', 'f1000000-0000-0000-0000-00000000000a', 'Redemptive History in the Parables of Luke', 'book', 'IVP Academic', 2019, 'Ridderbos-Lee, Herman. Redemptive History in the Parables. Downers Grove: IVP, 2019.', 1),
        ('03000000-0000-0000-0000-00000000000b', 'f1000000-0000-0000-0000-00000000000b', 'The Cross in the Desert: Contextual Apologetics in Global Islam', 'book', 'Zondervan Academic', 2019, 'Zwemer-Martyn, Samuel. The Cross in the Desert. Grand Rapids: Zondervan, 2019.', 1),
        ('03000000-0000-0000-0000-00000000000c', 'f1000000-0000-0000-0000-00000000000c', 'Jesus Through Peasant Eyes: Middle Eastern Cultural Studies in the Gospels', 'book', 'Eerdmans', 2020, 'Bailey-Nassif, Kenneth. Jesus Through Peasant Eyes. Grand Rapids: Eerdmans, 2020.', 1),
        ('03000000-0000-0000-0000-00000000000d', 'f1000000-0000-0000-0000-00000000000d', 'The Architecture of the Word: Expository Preaching and Classical Rhetoric', 'book', 'Crossway', 2023, 'Sayers-Spurgeon, Dorothy. The Architecture of the Word. Wheaton: Crossway, 2023.', 1),
        ('03000000-0000-0000-0000-00000000000e', 'f1000000-0000-0000-0000-00000000000e', 'The Gospel According to John: Theological Commentary and Exegesis', 'book', 'Eerdmans', 2017, 'Carson, Cornelius D. A. The Gospel According to John. Grand Rapids: Eerdmans, 2017.', 1)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 9. Courses
    await client.query(`
      INSERT INTO public.courses (
        id, scholar_id, title, slug, description, level, primary_discipline_id,
        delivery_modes, public_preview_enabled, visibility
      ) VALUES
        (
          '02000000-0000-0000-0000-000000000006',
          'f1000000-0000-0000-0000-000000000006',
          'Post-Reformation Reformed Scholasticism & The Puritans',
          'post-reformation-reformed-scholasticism',
          'A master-level seminar on Reformed orthodoxy from 1560 to 1700 with deep engagement in Latin primary source texts.',
          'graduate',
          'd1000000-0000-0000-0000-000000000004',
          ARRAY['online_asynchronous', 'online_synchronous', 'intensive'],
          true,
          'public'
        ),
        (
          '02000000-0000-0000-0000-000000000007',
          'f1000000-0000-0000-0000-000000000007',
          'Pauline Greek Exegesis: Galatians & Romans',
          'pauline-greek-exegesis-galatians-romans',
          'Rigorous textual and theological analysis of the Greek text of Galatians and Romans 1-8.',
          'graduate',
          'd1000000-0000-0000-0000-000000000002',
          ARRAY['online_synchronous', 'in_person'],
          true,
          'public'
        ),
        (
          '02000000-0000-0000-0000-000000000008',
          'f1000000-0000-0000-0000-000000000008',
          'Theology & Practice of Biblical Pastoral Counseling',
          'theology-practice-biblical-counseling',
          'Equipping pastoral ministers to handle complex grief, trauma, and relational brokenness with Scripture.',
          'graduate',
          'd1000000-0000-0000-0000-000000000006',
          ARRAY['online_synchronous', 'hybrid'],
          true,
          'public'
        ),
        (
          '02000000-0000-0000-0000-000000000009',
          'f1000000-0000-0000-0000-000000000009',
          'Dogmatic Prolegomena: Holy Scripture & Doctrine of God',
          'dogmatic-prolegomena-scripture-god',
          'Comprehensive survey of divine revelation, the triune nature of God, and classic Reformed dogmatics.',
          'graduate',
          'd1000000-0000-0000-0000-000000000003',
          ARRAY['online_asynchronous', 'in_person'],
          true,
          'public'
        ),
        (
          '02000000-0000-0000-0000-00000000000a',
          'f1000000-0000-0000-0000-00000000000a',
          'Redemptive-Historical Hermeneutics: From Genesis to Revelation',
          'redemptive-historical-hermeneutics',
          'A study of biblical-theological methodology following Geerhardus Vos and Herman Ridderbos.',
          'graduate',
          'd1000000-0000-0000-0000-000000000002',
          ARRAY['online_synchronous', 'intensive'],
          true,
          'public'
        ),
        (
          '02000000-0000-0000-0000-00000000000b',
          'f1000000-0000-0000-0000-00000000000b',
          'Global Missiology & Contextual Theology',
          'global-missiology-contextual-theology',
          'Historical and contemporary patterns of world Christian mission, biblical contextualization, and cross-cultural ministry.',
          'graduate',
          'd1000000-0000-0000-0000-000000000009',
          ARRAY['online_asynchronous', 'modular'],
          true,
          'public'
        ),
        (
          '02000000-0000-0000-0000-00000000000c',
          'f1000000-0000-0000-0000-00000000000c',
          'The Parables in Cultural Context',
          'parables-in-cultural-context',
          'Re-examining Jesus parables through the lenses of ancient Near Eastern and Middle Eastern peasant storytelling traditions.',
          'graduate',
          'd1000000-0000-0000-0000-000000000002',
          ARRAY['online_synchronous', 'in_person'],
          true,
          'public'
        ),
        (
          '02000000-0000-0000-0000-00000000000d',
          'f1000000-0000-0000-0000-00000000000d',
          'Expository Preaching: The Mechanics of Homiletics',
          'expository-preaching-mechanics',
          'Practical workshop on manuscript preparation, rhetorical pacing, and theological fidelity in the pulpit.',
          'graduate',
          'd1000000-0000-0000-0000-000000000006',
          ARRAY['in_person', 'intensive'],
          true,
          'public'
        ),
        (
          '02000000-0000-0000-0000-00000000000e',
          'f1000000-0000-0000-0000-00000000000e',
          'Johannine Theology & The Fourth Gospel',
          'johannine-theology-fourth-gospel',
          'Advanced postgraduate exegesis of the Gospel of John, covering Christology, pneumatology, and realized eschatology.',
          'graduate',
          'd1000000-0000-0000-0000-000000000002',
          ARRAY['online_synchronous', 'online_asynchronous'],
          true,
          'public'
        )
      ON CONFLICT (scholar_id, slug) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        visibility = 'public';
    `);

    // 10. Speaking Bureau Keynote Topics (explicit IDs)
    await client.query(`
      INSERT INTO public.speaker_topics (
        id, scholar_id, title, target_audience, description, sample_media_url, display_order
      ) VALUES
        ('e1000000-0000-0000-0000-000000000006', 'f1000000-0000-0000-0000-000000000006', 'The Puritan Mind for the Modern Church', 'pastoral', 'Why the seventeenth-century pastoral theology of the Puritans provides urgent remedies for modern pastoral burnout.', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 1),
        ('e1000000-0000-0000-0000-000000000007', 'f1000000-0000-0000-0000-000000000007', 'Justification in Contemporary Debate', 'academic', 'Addressing the New Perspective on Paul and apocalyptic readings of Galatians in light of the Reformers.', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 1),
        ('e1000000-0000-0000-0000-000000000008', 'f1000000-0000-0000-0000-000000000008', 'Counseling in the Shadow of Grief', 'church_wide', 'Practical guidance for local church lay leaders and elders walking alongside grieving and traumatized families.', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 1),
        ('e1000000-0000-0000-0000-000000000009', 'f1000000-0000-0000-0000-000000000009', 'Bavinck and the Wonder of Organic Grace', 'academic', 'The continuing relevance of Herman Bavinck theological anthropology for the 21st century.', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 1),
        ('e1000000-0000-0000-0000-00000000000a', 'f1000000-0000-0000-0000-00000000000b', 'Unreached Peoples in a Globalized Century', 'pastoral', 'Strategic imperatives for cross-cultural missions in rapidly urbanizing global metropolises.', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 1),
        ('e1000000-0000-0000-0000-00000000000b', 'f1000000-0000-0000-0000-00000000000d', 'Preaching Christ with Passion and Precision', 'pastoral', 'Homiletical principles drawn from C.H. Spurgeon and Jonathan Edwards for expository sermon construction.', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 1),
        ('e1000000-0000-0000-0000-00000000000c', 'f1000000-0000-0000-0000-00000000000e', 'The Glory of the Incarnate Word in John 1', 'academic', 'Exegesis and theological synthesis of the Prologue of the Fourth Gospel.', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 1)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 11. Profile Revisions for new scholars
    await client.query(`
      INSERT INTO public.scholar_profile_revisions (
        id, scholar_id, revision_number, status, snapshot_data, admin_notes, submitted_at, reviewed_at
      ) VALUES
        ('01000000-0000-0000-0000-000000000006', 'f1000000-0000-0000-0000-000000000006', 1, 'approved', '{"full_name": "Dr. Jonathan Edwards-Owen"}'::jsonb, 'Verified Yale Ph.D.', now(), now()),
        ('01000000-0000-0000-0000-000000000007', 'f1000000-0000-0000-0000-000000000007', 1, 'approved', '{"full_name": "Dr. Athanasius Gresham Machen"}'::jsonb, 'Verified Cambridge Ph.D.', now(), now()),
        ('01000000-0000-0000-0000-000000000008', 'f1000000-0000-0000-0000-000000000008', 1, 'approved', '{"full_name": "Dr. Priscilla Cornelia Van Til"}'::jsonb, 'Verified UPenn Ph.D.', now(), now()),
        ('01000000-0000-0000-0000-000000000009', 'f1000000-0000-0000-0000-000000000009', 1, 'approved', '{"full_name": "Dr. Augustine Herman Bavinck"}'::jsonb, 'Verified Free Univ Ph.D.', now(), now()),
        ('01000000-0000-0000-0000-00000000000a', 'f1000000-0000-0000-0000-00000000000a', 1, 'approved', '{"full_name": "Dr. Herman Ridderbos-Lee"}'::jsonb, 'Verified Aberdeen Ph.D.', now(), now()),
        ('01000000-0000-0000-0000-00000000000b', 'f1000000-0000-0000-0000-00000000000b', 1, 'approved', '{"full_name": "Dr. Samuel Zwemer-Martyn"}'::jsonb, 'Verified Fuller Ph.D.', now(), now()),
        ('01000000-0000-0000-0000-00000000000c', 'f1000000-0000-0000-0000-00000000000c', 1, 'approved', '{"full_name": "Dr. Kenneth Bailey-Nassif"}'::jsonb, 'Verified Manchester Ph.D.', now(), now()),
        ('01000000-0000-0000-0000-00000000000d', 'f1000000-0000-0000-0000-00000000000d', 1, 'approved', '{"full_name": "Dr. Dorothy Sayers-Spurgeon"}'::jsonb, 'Verified St Andrews Ph.D.', now(), now()),
        ('01000000-0000-0000-0000-00000000000e', 'f1000000-0000-0000-0000-00000000000e', 1, 'approved', '{"full_name": "Dr. Cornelius D. A. Carson"}'::jsonb, 'Verified Oxford Ph.D.', now(), now())
      ON CONFLICT (scholar_id, revision_number) DO NOTHING;
    `);

    // 12. Link published revision IDs
    await client.query(`
      UPDATE public.scholars SET published_revision_id = '01000000-0000-0000-0000-000000000006' WHERE id = 'f1000000-0000-0000-0000-000000000006';
      UPDATE public.scholars SET published_revision_id = '01000000-0000-0000-0000-000000000007' WHERE id = 'f1000000-0000-0000-0000-000000000007';
      UPDATE public.scholars SET published_revision_id = '01000000-0000-0000-0000-000000000008' WHERE id = 'f1000000-0000-0000-0000-000000000008';
      UPDATE public.scholars SET published_revision_id = '01000000-0000-0000-0000-000000000009' WHERE id = 'f1000000-0000-0000-0000-000000000009';
      UPDATE public.scholars SET published_revision_id = '01000000-0000-0000-0000-00000000000a' WHERE id = 'f1000000-0000-0000-0000-00000000000a';
      UPDATE public.scholars SET published_revision_id = '01000000-0000-0000-0000-00000000000b' WHERE id = 'f1000000-0000-0000-0000-00000000000b';
      UPDATE public.scholars SET published_revision_id = '01000000-0000-0000-0000-00000000000c' WHERE id = 'f1000000-0000-0000-0000-00000000000c';
      UPDATE public.scholars SET published_revision_id = '01000000-0000-0000-0000-00000000000d' WHERE id = 'f1000000-0000-0000-0000-00000000000d';
      UPDATE public.scholars SET published_revision_id = '01000000-0000-0000-0000-00000000000e' WHERE id = 'f1000000-0000-0000-0000-00000000000e';
    `);

    await client.query('COMMIT;');
    console.log('✅ EXPANDED PILOT COHORT SUCCESSFULLY SEEDED (15+ Scholars Across All 9 Disciplines).\n');
  } catch (err) {
    await client.query('ROLLBACK;');
    console.error('Error seeding expanded pilot cohort:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  seedExpandedPilotCohort();
}
