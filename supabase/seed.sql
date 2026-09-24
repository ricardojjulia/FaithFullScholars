-- ==============================================================================
-- FaithFull Scholars — Phase 1 Seed Data
-- Populates authentic theological disciplines, traditions, historic confessional
-- standards, sample institutions, auth users, scholars, publications, courses,
-- and availability profiles. All UUIDs strictly use valid hex digits (0-9, a-f).
-- ==============================================================================

-- 1. Disciplines
INSERT INTO public.disciplines (id, name, slug, category, description) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'Old Testament & Hebrew Scriptures', 'old-testament', 'Biblical Studies', 'Grammatical-historical exposition, Pentateuch, Historical books, Prophets, and Poetic literature.'),
  ('d1000000-0000-0000-0000-000000000002', 'New Testament & Early Christian Literature', 'new-testament', 'Biblical Studies', 'Gospels, Pauline epistles, General epistles, Johannine literature, and Greco-Roman background.'),
  ('d1000000-0000-0000-0000-000000000003', 'Systematic Theology', 'systematic-theology', 'Theology', 'Doctrines of God, Christology, Pneumatology, Soteriology, Ecclesiology, and Eschatology.'),
  ('d1000000-0000-0000-0000-000000000004', 'Church History & Historical Theology', 'church-history', 'Historical Studies', 'Patristic, Medieval, Reformation, Post-Reformation, and Modern theological developments.'),
  ('d1000000-0000-0000-0000-000000000005', 'Biblical Languages (Greek & Hebrew)', 'biblical-languages', 'Biblical Studies', 'Biblical Hebrew, Aramaic, and Hellenistic (Koine) Greek morphology, syntax, and discourse analysis.'),
  ('d1000000-0000-0000-0000-000000000006', 'Pastoral Ministry & Homiletics', 'pastoral-ministry', 'Practical Theology', 'Expository preaching, pastoral care, pastoral leadership, and congregational oversight.'),
  ('d1000000-0000-0000-0000-000000000007', 'Christian Ethics & Moral Philosophy', 'christian-ethics', 'Theology & Philosophy', 'Biblical ethics, bioethics, public theology, justice, and social responsibility.'),
  ('d1000000-0000-0000-0000-000000000008', 'Christian Apologetics & Philosophy of Religion', 'apologetics', 'Theology & Philosophy', 'Defense of Christian theism, epistemology, problem of evil, and historical reliability of scripture.'),
  ('d1000000-0000-0000-0000-000000000009', 'Missiology & Intercultural Studies', 'missiology', 'Practical Theology', 'Global missions theology, cross-cultural contextualization, church planting, and world religions.')
ON CONFLICT (slug) DO NOTHING;

-- 2. Traditions
INSERT INTO public.traditions (id, name, slug, description) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Reformed & Presbyterian', 'reformed-presbyterian', 'Covenantal theology adhering to the historic Reformed confessions, emphasizing divine sovereignty.'),
  ('b1000000-0000-0000-0000-000000000002', 'Baptist', 'baptist', 'Affirming believer''s baptism, congregational polity, and liberty of conscience in evangelical tradition.'),
  ('b1000000-0000-0000-0000-000000000003', 'Anglican & Episcopal', 'anglican', 'Historic via media tradition grounded in the Book of Common Prayer and the Thirty-Nine Articles.'),
  ('b1000000-0000-0000-0000-000000000004', 'Lutheran', 'lutheran', 'Rooted in the Book of Concord, law-gospel distinction, and justification by faith alone.'),
  ('b1000000-0000-0000-0000-000000000005', 'Wesleyan & Methodist', 'wesleyan-methodist', 'Rooted in Wesley''s evangelical theology, prevenient grace, holiness, and active love.'),
  ('b1000000-0000-0000-0000-000000000006', 'Evangelical (Non-Denominational)', 'evangelical', 'Broad historic Protestant evangelicalism centered on biblical authority, crucicentrism, and conversionism.')
ON CONFLICT (slug) DO NOTHING;

-- 3. Confessional Standards
INSERT INTO public.confessional_standards (id, name, slug, year, tradition_affinity, description) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Nicene-Constantinopolitan Creed', 'nicene-creed', 381, 'Ecumenical', 'Historic ecumenical symbol defining the orthodox doctrine of the Trinity and consubstantiality of the Son.'),
  ('c1000000-0000-0000-0000-000000000002', 'Apostles'' Creed', 'apostles-creed', 140, 'Ecumenical', 'Universal summary of fundamental Christian apostolic teaching recognized across historic Christendom.'),
  ('c1000000-0000-0000-0000-000000000003', 'Chalcedonian Definition', 'chalcedonian-definition', 451, 'Ecumenical', 'Affirmation of Christ as two natures in one person, without confusion, change, division, or separation.'),
  ('c1000000-0000-0000-0000-000000000004', 'Westminster Confession of Faith', 'westminster-confession', 1646, 'Reformed & Presbyterian', 'Standard Reformed confession formulated at Westminster Assembly outlining covenant theology and doctrine.'),
  ('c1000000-0000-0000-0000-000000000005', 'Westminster Shorter Catechism', 'westminster-shorter-catechism', 1647, 'Reformed & Presbyterian', 'Catechetical standard outlining man''s chief end, the Decalogue, Lord''s Prayer, and Sacraments.'),
  ('c1000000-0000-0000-0000-000000000006', 'Second London Baptist Confession (1689)', '1689-london-baptist', 1689, 'Baptist', 'Particular Baptist confession affirming Reformed soteriology and believer''s immersion.'),
  ('c1000000-0000-0000-0000-000000000007', 'Heidelberg Catechism', 'heidelberg-catechism', 1563, 'Continental Reformed', 'Beloved Three Forms of Unity standard structured around Guilt, Grace, and Gratitude.'),
  ('c1000000-0000-0000-0000-000000000008', 'Belgic Confession', 'belgic-confession', 1561, 'Continental Reformed', 'Historic French/Dutch Reformed confession authored by Guido de Brès.'),
  ('c1000000-0000-0000-0000-000000000009', 'Canons of Dort', 'canons-of-dort', 1619, 'Continental Reformed', 'Doctrinal decisions of the Synod of Dort defining the Five Points of Calvinism.'),
  ('c1000000-0000-0000-0000-000000000010', 'Thirty-Nine Articles of Religion', 'thirty-nine-articles', 1571, 'Anglican', 'Historic doctrinal definition of the Church of England established in the Elizabethan settlement.'),
  ('c1000000-0000-0000-0000-000000000011', 'Augsburg Confession', 'augsburg-confession', 1530, 'Lutheran', 'Primary confession of faith of the Lutheran Church presented to Emperor Charles V by Philip Melanchthon.'),
  ('c1000000-0000-0000-0000-000000000012', 'Chicago Statement on Biblical Inerrancy', 'chicago-statement-inerrancy', 1978, 'Evangelical', 'Contemporary affirmation of verbal-plenary inspiration, authority, and inerrancy of Scripture.')
ON CONFLICT (slug) DO NOTHING;

-- 4. Sample Institutions
INSERT INTO public.institutions (
  id, name, slug, website, institution_type, status, contact_email, location,
  accreditation_body, accreditation_status, accreditation_verified_at
) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'Westminster Theological Seminary', 'westminster-theological-seminary', 'https://www.wts.edu', 'seminary', 'approved', 'academics@wts.edu', 'Glenside, PA', 'ATS', 'accredited', now() - interval '180 days'),
  ('e1000000-0000-0000-0000-000000000002', 'Reformed Theological Seminary', 'reformed-theological-seminary', 'https://rts.edu', 'seminary', 'approved', 'dean@rts.edu', 'Orlando, FL', 'ATS', 'accredited', now() - interval '150 days'),
  ('e1000000-0000-0000-0000-000000000003', 'Southern Baptist Theological Seminary', 'sbts', 'https://www.sbts.edu', 'seminary', 'approved', 'faculty@sbts.edu', 'Louisville, KY', 'ATS', 'accredited', now() - interval '200 days'),
  ('e1000000-0000-0000-0000-000000000004', 'Trinity Evangelical Divinity School', 'teds', 'https://www.tiu.edu/divinity', 'seminary', 'approved', 'provost@tiu.edu', 'Deerfield, IL', 'ATS', 'accredited', now() - interval '120 days')
ON CONFLICT (slug) DO UPDATE SET
  accreditation_body = EXCLUDED.accreditation_body,
  accreditation_status = EXCLUDED.accreditation_status,
  accreditation_verified_at = EXCLUDED.accreditation_verified_at;

-- 5. Sample Auth Users (Supabase Auth)
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES 
  ('a1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@faithfullscholars.org', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('a1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.calvin.edwards@faithfullscholars.org', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('a1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.sarah.macarthur@faithfullscholars.org', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('a1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'recruiter@wts.edu', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('a1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.thomas.cranmer@faithfullscholars.org', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('a1000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.marcus.vance@faithfullscholars.org', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('a1000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.elizabeth.knox@faithfullscholars.org', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 6. Sample Accounts
INSERT INTO public.accounts (id, email, role) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'admin@faithfullscholars.org', 'admin'),
  ('a1000000-0000-0000-0000-000000000002', 'dr.calvin.edwards@faithfullscholars.org', 'scholar'),
  ('a1000000-0000-0000-0000-000000000003', 'dr.sarah.macarthur@faithfullscholars.org', 'scholar'),
  ('a1000000-0000-0000-0000-000000000004', 'recruiter@wts.edu', 'institution_user'),
  ('a1000000-0000-0000-0000-000000000005', 'dr.thomas.cranmer@faithfullscholars.org', 'scholar'),
  ('a1000000-0000-0000-0000-000000000006', 'dr.marcus.vance@faithfullscholars.org', 'scholar'),
  ('a1000000-0000-0000-0000-000000000007', 'dr.elizabeth.knox@faithfullscholars.org', 'scholar')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role;

-- 7. Sample Scholars
INSERT INTO public.scholars (
  id, account_id, slug, full_name, title, current_institution, institutional_role,
  biography, location, timezone, contact_preference, profile_status, verification_status,
  doctrinal_statement_text
) VALUES
  (
    'f1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000002',
    'calvin-edwards',
    'Dr. Calvin Edwards',
    'Professor of Historical Theology & Reformed Dogmatics',
    'Westminster Theological Seminary',
    'Senior Research Fellow',
    'Specializing in Post-Reformation Reformed Orthodoxy, 17th-century federal theology, and Latin scholastic disputations. Over 20 years of graduate and doctoral teaching experience.',
    'Philadelphia, PA',
    'America/New_York',
    'institution_inquiry',
    'approved',
    'verified',
    'I affirm without reservation the orthodox Trinitarian and Christological definitions of Nicaea and Chalcedon, and the full verbal-plenary inspiration and inerrancy of Holy Scripture as articulated in the Westminster Confession of Faith.'
  ),
  (
    'f1000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000003',
    'sarah-macarthur',
    'Dr. Sarah MacArthur',
    'Associate Professor of New Testament Studies',
    'Trinity Evangelical Divinity School',
    'Associate Professor',
    'Scholar of Johannine literature and Greco-Roman background. Passionate about teaching Hellenistic Greek exegesis, hermeneutics, and early Christian christological development.',
    'Chicago, IL',
    'America/Chicago',
    'institution_inquiry',
    'approved',
    'verified',
    'I gladly subscribe to the Chicago Statement on Biblical Inerrancy and affirm the Apostles'' Creed and Nicene Creed as faithful summaries of biblical revelation.'
  ),
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
ON CONFLICT (slug) DO UPDATE SET full_name = EXCLUDED.full_name, biography = EXCLUDED.biography;

-- 8. Initial Scholar Revisions (ADR 0005)
INSERT INTO public.scholar_profile_revisions (
  id, scholar_id, revision_number, status, snapshot_data, admin_notes, submitted_at, reviewed_at
) VALUES
  (
    '01000000-0000-0000-0000-000000000001',
    'f1000000-0000-0000-0000-000000000001',
    1,
    'approved',
    '{"full_name": "Dr. Calvin Edwards", "title": "Professor of Historical Theology & Reformed Dogmatics", "biography": "Specializing in Post-Reformation Reformed Orthodoxy, 17th-century federal theology, and Latin scholastic disputations."}'::jsonb,
    'Initial verified academic profile approved by dean review.',
    now() - interval '30 days',
    now() - interval '29 days'
  ),
  (
    '01000000-0000-0000-0000-000000000002',
    'f1000000-0000-0000-0000-000000000002',
    1,
    'approved',
    '{"full_name": "Dr. Sarah MacArthur", "title": "Associate Professor of New Testament Studies", "biography": "Scholar of Johannine literature and Greco-Roman background."}'::jsonb,
    'Initial profile verification clean.',
    now() - interval '14 days',
    now() - interval '13 days'
  ),
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

-- Link published revisions
UPDATE public.scholars SET published_revision_id = '01000000-0000-0000-0000-000000000001' WHERE id = 'f1000000-0000-0000-0000-000000000001';
UPDATE public.scholars SET published_revision_id = '01000000-0000-0000-0000-000000000002' WHERE id = 'f1000000-0000-0000-0000-000000000002';
UPDATE public.scholars SET published_revision_id = '01000000-0000-0000-0000-000000000003' WHERE id = 'f1000000-0000-0000-0000-000000000003';
UPDATE public.scholars SET published_revision_id = '01000000-0000-0000-0000-000000000004' WHERE id = 'f1000000-0000-0000-0000-000000000004';
UPDATE public.scholars SET published_revision_id = '01000000-0000-0000-0000-000000000005' WHERE id = 'f1000000-0000-0000-0000-000000000005';

-- 9. Scholar Disciplines
INSERT INTO public.scholar_disciplines (scholar_id, discipline_id, is_primary) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000004', true),
  ('f1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000003', false),
  ('f1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', true),
  ('f1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000005', false),
  ('f1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001', true),
  ('f1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000005', false),
  ('f1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000008', true),
  ('f1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000003', false),
  ('f1000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000007', true),
  ('f1000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000006', false)
ON CONFLICT (scholar_id, discipline_id) DO NOTHING;

-- 10. Scholar Traditions
INSERT INTO public.scholar_traditions (scholar_id, tradition_id, is_primary) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', true),
  ('f1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000006', true),
  ('f1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003', true),
  ('f1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002', true),
  ('f1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000001', true)
ON CONFLICT (scholar_id, tradition_id) DO NOTHING;

-- 11. Scholar Confessions
INSERT INTO public.scholar_confessions (scholar_id, confessional_standard_id, adherence_level, exception_notes) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000004', 'full_subscription', NULL),
  ('f1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'full_subscription', NULL),
  ('f1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000012', 'full_subscription', NULL),
  ('f1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'full_subscription', NULL),
  ('f1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000010', 'full_subscription', NULL),
  ('f1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001', 'full_subscription', NULL),
  ('f1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000006', 'full_subscription', NULL),
  ('f1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000012', 'full_subscription', NULL),
  ('f1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000004', 'full_subscription', NULL),
  ('f1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000002', 'full_subscription', NULL)
ON CONFLICT (scholar_id, confessional_standard_id) DO NOTHING;

-- 12. Credentials
INSERT INTO public.credentials (scholar_id, degree, field_of_study, institution_name, year_awarded, is_terminal, display_order) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'Ph.D.', 'Historical Theology', 'University of Edinburgh', 2008, true, 1),
  ('f1000000-0000-0000-0000-000000000001', 'Th.M.', 'Systematic Theology', 'Westminster Theological Seminary', 2004, false, 2),
  ('f1000000-0000-0000-0000-000000000001', 'M.Div.', 'Pastoral Studies', 'Reformed Theological Seminary', 2002, false, 3),
  ('f1000000-0000-0000-0000-000000000002', 'Ph.D.', 'New Testament & Early Christianity', 'University of Cambridge', 2014, true, 1),
  ('f1000000-0000-0000-0000-000000000002', 'M.A.', 'Biblical Languages', 'Trinity Evangelical Divinity School', 2010, false, 2),
  ('f1000000-0000-0000-0000-000000000003', 'D.Phil.', 'Hebrew & Semitic Studies', 'University of Oxford', 2012, true, 1),
  ('f1000000-0000-0000-0000-000000000003', 'M.St.', 'Jewish Studies in the Graeco-Roman Period', 'University of Oxford', 2008, false, 2),
  ('f1000000-0000-0000-0000-000000000004', 'Ph.D.', 'Systematic Theology & Apologetics', 'Southern Baptist Theological Seminary', 2016, true, 1),
  ('f1000000-0000-0000-0000-000000000004', 'M.Div.', 'Theology & Biblical Languages', 'Southern Baptist Theological Seminary', 2011, false, 2),
  ('f1000000-0000-0000-0000-000000000005', 'Ph.D.', 'Christian Ethics', 'Princeton Theological Seminary', 2015, true, 1),
  ('f1000000-0000-0000-0000-000000000005', 'Th.M.', 'Historical & Practical Theology', 'Reformed Theological Seminary', 2010, false, 2),
  ('f1000000-0000-0000-0000-000000000005', 'M.Div.', 'Pastoral Ministry', 'Gordon-Conwell Theological Seminary', 2008, false, 3)
ON CONFLICT DO NOTHING;

-- 13. Publications
INSERT INTO public.publications (scholar_id, title, publication_type, publisher_or_journal, year, citation_text, display_order) VALUES
  (
    'f1000000-0000-0000-0000-000000000001',
    'The Covenant of Works in Post-Reformation Scholasticism',
    'book',
    'Oxford University Press',
    2018,
    'Edwards, Calvin. The Covenant of Works in Post-Reformation Scholasticism. Oxford: Oxford University Press, 2018.',
    1
  ),
  (
    'f1000000-0000-0000-0000-000000000002',
    'Light in the Darkness: The Prologue of John in Greco-Roman Context',
    'monograph',
    'Baker Academic',
    2020,
    'MacArthur, Sarah. Light in the Darkness: The Prologue of John in Greco-Roman Context. Grand Rapids: Baker Academic, 2020.',
    1
  ),
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

-- 14. Courses
INSERT INTO public.courses (
  id, scholar_id, title, slug, description, level, primary_discipline_id,
  delivery_modes, public_preview_enabled, visibility
) VALUES
  (
    '02000000-0000-0000-0000-000000000001',
    'f1000000-0000-0000-0000-000000000001',
    'Historical Theology II: The Reformation & Early Modern Era',
    'hist-theo-2-reformation',
    'A comprehensive survey of European Reformation movements (Lutheran, Reformed, Anabaptist, Anglican) and post-Reformation scholastic dogmatics.',
    'graduate',
    'd1000000-0000-0000-0000-000000000004',
    ARRAY['online_sync', 'online_async', 'in_person_modular'],
    true,
    'public'
  ),
  (
    '02000000-0000-0000-0000-000000000002',
    'f1000000-0000-0000-0000-000000000002',
    'Exegesis of the Gospel of John (Greek)',
    'exegesis-gospel-john',
    'Detailed grammatical and theological exegesis of select discourses in the Fourth Gospel using the Nestle-Aland Novum Testamentum Graece.',
    'graduate',
    'd1000000-0000-0000-0000-000000000002',
    ARRAY['online_sync', 'in_person_semester'],
    true,
    'public'
  ),
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

-- 15. Availability Profiles
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
    'f1000000-0000-0000-0000-000000000002',
    true,
    ARRAY['guest_lecturing', 'curriculum_consulting', 'online_instruction'],
    ARRAY['online_sync', 'online_async'],
    ARRAY['Fall 2026', 'Spring 2027'],
    'Available for online Hellenistic Greek exegesis modules and guest lectures on Johannine theology.',
    null,
    null,
    null
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
ON CONFLICT (scholar_id) DO NOTHING;

-- 16. Institution Academic Postings (Opportunities Marketplace)
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

-- 17. Authoritative Institutional Faculty Endorsements
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

-- 18. Speaker Topics (Speaking Bureau)
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
ON CONFLICT (id) DO NOTHING;

-- 15. Tiered Institutional Subscriptions (ADR 0010)
INSERT INTO public.institution_subscriptions (
  id, institution_id, tier, billing_cycle, status, seats_limit, monthly_inquiry_limit, inquiries_used_current_month
) VALUES
  (
    'b7000000-0000-0000-0000-000000000001',
    'e1000000-0000-0000-0000-000000000001', -- Westminster Theological Seminary
    'premier_partner',
    'annual',
    'active',
    10,
    99999,
    2
  ),
  (
    'b7000000-0000-0000-0000-000000000002',
    'e1000000-0000-0000-0000-000000000002', -- Reformed Theological Seminary
    'verified_seminary',
    'annual',
    'active',
    3,
    25,
    1
  ),
  (
    'b7000000-0000-0000-0000-000000000003',
    'e1000000-0000-0000-0000-000000000003', -- Southern Baptist Theological Seminary
    'verified_seminary',
    'monthly',
    'active',
    3,
    25,
    0
  ),
  (
    'b7000000-0000-0000-0000-000000000004',
    'e1000000-0000-0000-0000-000000000004', -- Trinity Evangelical Divinity School
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

-- 16. Institutional Engagement Contracts (ADR 0011)
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

-- 17. Contract Milestones (ADR 0011)
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

-- 18. Seminary Consortia & Multi-Campus System Accounts (ADR 0012)
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

-- 19. Expanded Pilot Cohort (15+ Scholars across all 9 theological disciplines)
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  ('a1000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.jonathan.owen@faithfullscholars.org', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('a1000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.athanasius.machen@faithfullscholars.org', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('a1000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.priscilla.vantil@faithfullscholars.org', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('a1000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.augustine.bavinck@faithfullscholars.org', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('a1000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.herman.ridderbos@faithfullscholars.org', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('a1000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.samuel.zwemer@faithfullscholars.org', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('a1000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.kenneth.bailey@faithfullscholars.org', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('a1000000-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.dorothy.spurgeon@faithfullscholars.org', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('a1000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.cornelius.carson@faithfullscholars.org', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
ON CONFLICT (id) DO NOTHING;

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

UPDATE public.scholars SET published_revision_id = '01000000-0000-0000-0000-000000000006' WHERE id = 'f1000000-0000-0000-0000-000000000006';
UPDATE public.scholars SET published_revision_id = '01000000-0000-0000-0000-000000000007' WHERE id = 'f1000000-0000-0000-0000-000000000007';
UPDATE public.scholars SET published_revision_id = '01000000-0000-0000-0000-000000000008' WHERE id = 'f1000000-0000-0000-0000-000000000008';
UPDATE public.scholars SET published_revision_id = '01000000-0000-0000-0000-000000000009' WHERE id = 'f1000000-0000-0000-0000-000000000009';
UPDATE public.scholars SET published_revision_id = '01000000-0000-0000-0000-00000000000a' WHERE id = 'f1000000-0000-0000-0000-00000000000a';
UPDATE public.scholars SET published_revision_id = '01000000-0000-0000-0000-00000000000b' WHERE id = 'f1000000-0000-0000-0000-00000000000b';
UPDATE public.scholars SET published_revision_id = '01000000-0000-0000-0000-00000000000c' WHERE id = 'f1000000-0000-0000-0000-00000000000c';
UPDATE public.scholars SET published_revision_id = '01000000-0000-0000-0000-00000000000d' WHERE id = 'f1000000-0000-0000-0000-00000000000d';
UPDATE public.scholars SET published_revision_id = '01000000-0000-0000-0000-00000000000e' WHERE id = 'f1000000-0000-0000-0000-00000000000e';

-- 20. Sample Course Licensing Agreements (ADR 0013)
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
  royalty_amount = EXCLUDED.royalty_amount,
  status = EXCLUDED.status;





