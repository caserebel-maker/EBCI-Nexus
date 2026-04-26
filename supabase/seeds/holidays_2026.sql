-- Seed Thai public holidays 2026 (พ.ศ. 2569).
--
-- Fixed-date Gregorian holidays only. Lunar Buddhist holidays
-- (มาฆบูชา / วิสาขบูชา / อาฬหบูชา / เข้าพรรษา) shift each year per
-- the official government announcement (Royal Gazette) — add via the
-- /hradmin/holidays admin UI when the year's calendar is published.
--
-- Source: ราชกิจจานุเบกษา / กรมการปกครอง 2569 calendar.
-- Confirm against https://www.bot.or.th/en/financial-markets/holiday.html
-- before relying on these for compliance-critical flows.

INSERT INTO public.holidays (date, name, type) VALUES
    ('2026-01-01', 'วันขึ้นปีใหม่',                                'public'),
    ('2026-04-06', 'วันจักรี',                                       'public'),
    ('2026-04-13', 'วันสงกรานต์',                                   'public'),
    ('2026-04-14', 'วันสงกรานต์',                                   'public'),
    ('2026-04-15', 'วันสงกรานต์',                                   'public'),
    ('2026-05-01', 'วันแรงงานแห่งชาติ',                              'public'),
    ('2026-05-04', 'วันฉัตรมงคล',                                   'public'),
    ('2026-06-03', 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี', 'public'),
    ('2026-07-28', 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว',     'public'),
    ('2026-08-12', 'วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง / วันแม่แห่งชาติ', 'public'),
    ('2026-10-13', 'วันคล้ายวันสวรรคตพระบาทสมเด็จพระบรมชนกาธิเบศรฯ', 'public'),
    ('2026-10-23', 'วันปิยมหาราช',                                   'public'),
    ('2026-12-05', 'วันคล้ายวันพระบรมราชสมภพรัชกาลที่ ๙ / วันพ่อแห่งชาติ', 'public'),
    ('2026-12-10', 'วันรัฐธรรมนูญ',                                 'public'),
    ('2026-12-31', 'วันสิ้นปี',                                       'public')
ON CONFLICT (date, name) DO NOTHING;

-- ── Lunar Buddhist holidays (TENTATIVE — verify per Royal Gazette) ────
-- Buddhist holiday dates shift each year per the Thai lunar calendar.
-- The dates below are best-effort approximations from common references.
-- ⚠️  Update via /hradmin/holidays admin UI when the official Royal
-- Gazette announcement for 2569 is consulted.
INSERT INTO public.holidays (date, name, type) VALUES
    ('2026-03-03', 'วันมาฆบูชา (โดยประมาณ — โปรดยืนยัน)',     'religious'),
    ('2026-05-31', 'วันวิสาขบูชา (โดยประมาณ — โปรดยืนยัน)',    'religious'),
    ('2026-07-29', 'วันอาฬหบูชา (โดยประมาณ — โปรดยืนยัน)',     'religious'),
    ('2026-07-30', 'วันเข้าพรรษา (โดยประมาณ — โปรดยืนยัน)',    'religious')
ON CONFLICT (date, name) DO NOTHING;

-- Verify (expect 19 rows: 15 fixed-date public + 4 tentative lunar religious):
-- SELECT date, name, type FROM public.holidays WHERE year = 2026 ORDER BY date;
