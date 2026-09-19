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
INSERT INTO public.institutions (id, name, slug, website, institution_type, status, contact_email, location) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'Westminster Theological Seminary', 'westminster-theological-seminary', 'https://www.wts.edu', 'seminary', 'approved', 'academics@wts.edu', 'Glenside, PA'),
  ('e1000000-0000-0000-0000-000000000002', 'Reformed Theological Seminary', 'reformed-theological-seminary', 'https://rts.edu', 'seminary', 'approved', 'dean@rts.edu', 'Orlando, FL'),
  ('e1000000-0000-0000-0000-000000000003', 'Southern Baptist Theological Seminary', 'sbts', 'https://www.sbts.edu', 'seminary', 'approved', 'faculty@sbts.edu', 'Louisville, KY'),
  ('e1000000-0000-0000-0000-000000000004', 'Trinity Evangelical Divinity School', 'teds', 'https://www.tiu.edu/divinity', 'seminary', 'approved', 'provost@tiu.edu', 'Deerfield, IL')
ON CONFLICT (slug) DO NOTHING;

-- 5. Sample Auth Users (Supabase Auth)
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES 
  ('a1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@faithfullscholars.org', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('a1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.calvin.edwards@faithfullscholars.org', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('a1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dr.sarah.macarthur@faithfullscholars.org', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('a1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'recruiter@wts.edu', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 6. Sample Accounts
INSERT INTO public.accounts (id, email, role) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'admin@faithfullscholars.org', 'admin'),
  ('a1000000-0000-0000-0000-000000000002', 'dr.calvin.edwards@faithfullscholars.org', 'scholar'),
  ('a1000000-0000-0000-0000-000000000003', 'dr.sarah.macarthur@faithfullscholars.org', 'scholar'),
  ('a1000000-0000-0000-0000-000000000004', 'recruiter@wts.edu', 'institution_user')
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
  )
ON CONFLICT (scholar_id, revision_number) DO NOTHING;

-- Link published revisions
UPDATE public.scholars SET published_revision_id = '01000000-0000-0000-0000-000000000001' WHERE id = 'f1000000-0000-0000-0000-000000000001';
UPDATE public.scholars SET published_revision_id = '01000000-0000-0000-0000-000000000002' WHERE id = 'f1000000-0000-0000-0000-000000000002';

-- 9. Scholar Disciplines
INSERT INTO public.scholar_disciplines (scholar_id, discipline_id, is_primary) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000004', true),
  ('f1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000003', false),
  ('f1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', true),
  ('f1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000005', false)
ON CONFLICT (scholar_id, discipline_id) DO NOTHING;

-- 10. Scholar Traditions
INSERT INTO public.scholar_traditions (scholar_id, tradition_id, is_primary) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', true),
  ('f1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000006', true)
ON CONFLICT (scholar_id, tradition_id) DO NOTHING;

-- 11. Scholar Confessions
INSERT INTO public.scholar_confessions (scholar_id, confessional_standard_id, adherence_level, exception_notes) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000004', 'full_subscription', NULL),
  ('f1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'full_subscription', NULL),
  ('f1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000012', 'full_subscription', NULL),
  ('f1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'full_subscription', NULL)
ON CONFLICT (scholar_id, confessional_standard_id) DO NOTHING;

-- 12. Credentials
INSERT INTO public.credentials (scholar_id, degree, field_of_study, institution_name, year_awarded, is_terminal, display_order) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'Ph.D.', 'Historical Theology', 'University of Edinburgh', 2008, true, 1),
  ('f1000000-0000-0000-0000-000000000001', 'Th.M.', 'Systematic Theology', 'Westminster Theological Seminary', 2004, false, 2),
  ('f1000000-0000-0000-0000-000000000001', 'M.Div.', 'Pastoral Studies', 'Reformed Theological Seminary', 2002, false, 3),
  ('f1000000-0000-0000-0000-000000000002', 'Ph.D.', 'New Testament & Early Christianity', 'University of Cambridge', 2014, true, 1),
  ('f1000000-0000-0000-0000-000000000002', 'M.A.', 'Biblical Languages', 'Trinity Evangelical Divinity School', 2010, false, 2)
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
  )
ON CONFLICT (scholar_id, slug) DO NOTHING;

-- 15. Availability Profiles
INSERT INTO public.availability_profiles (
  scholar_id, is_available_for_hire, opportunity_types, preferred_delivery_modes, available_terms, notes
) VALUES
  (
    'f1000000-0000-0000-0000-000000000001',
    true,
    ARRAY['adjunct_teaching', 'online_instruction', 'intensives_modular', 'doctoral_supervision'],
    ARRAY['online_sync', 'in_person_modular'],
    ARRAY['Spring 2027', 'Summer 2027'],
    'Available for 1–2 week modular intensives or online synchronous seminar instruction in Historical Theology.'
  ),
  (
    'f1000000-0000-0000-0000-000000000002',
    true,
    ARRAY['guest_lecturing', 'curriculum_consulting', 'online_instruction'],
    ARRAY['online_sync', 'online_async'],
    ARRAY['Fall 2026', 'Spring 2027'],
    'Available for online Hellenistic Greek exegesis modules and guest lectures on Johannine theology.'
  )
ON CONFLICT (scholar_id) DO NOTHING;
