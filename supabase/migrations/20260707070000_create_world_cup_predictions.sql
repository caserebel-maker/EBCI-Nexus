-- Hidden World Cup champion prediction event.
-- Employees pick one champion candidate; HR/Admin can review totals.

CREATE TABLE IF NOT EXISTS public.world_cup_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    prize_amount NUMERIC NOT NULL DEFAULT 1000,
    status TEXT NOT NULL DEFAULT 'draft',
    closes_at TIMESTAMPTZ,
    champion_team_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT world_cup_events_status_check
        CHECK (status IN ('draft', 'open', 'closed', 'settled'))
);

CREATE TABLE IF NOT EXISTS public.world_cup_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.world_cup_events(id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    team_name_en TEXT,
    flag_emoji TEXT,
    seed_order INTEGER NOT NULL DEFAULT 0,
    accent_color TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT world_cup_teams_event_team_unique UNIQUE (event_id, team_name)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'world_cup_events_champion_team_fk'
    ) THEN
        ALTER TABLE public.world_cup_events
            ADD CONSTRAINT world_cup_events_champion_team_fk
            FOREIGN KEY (champion_team_id)
            REFERENCES public.world_cup_teams(id)
            ON DELETE SET NULL;
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.world_cup_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.world_cup_events(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.world_cup_teams(id) ON DELETE RESTRICT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT world_cup_predictions_one_pick UNIQUE (event_id, employee_id)
);

CREATE INDEX IF NOT EXISTS world_cup_teams_event_id_idx
    ON public.world_cup_teams(event_id);

CREATE INDEX IF NOT EXISTS world_cup_predictions_event_id_idx
    ON public.world_cup_predictions(event_id);

CREATE INDEX IF NOT EXISTS world_cup_predictions_employee_id_idx
    ON public.world_cup_predictions(employee_id);

CREATE INDEX IF NOT EXISTS world_cup_predictions_team_id_idx
    ON public.world_cup_predictions(team_id);

ALTER TABLE public.world_cup_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_cup_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_cup_predictions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.touch_world_cup_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS world_cup_events_touch_updated_at ON public.world_cup_events;
CREATE TRIGGER world_cup_events_touch_updated_at
    BEFORE UPDATE ON public.world_cup_events
    FOR EACH ROW EXECUTE FUNCTION public.touch_world_cup_updated_at();

DROP TRIGGER IF EXISTS world_cup_teams_touch_updated_at ON public.world_cup_teams;
CREATE TRIGGER world_cup_teams_touch_updated_at
    BEFORE UPDATE ON public.world_cup_teams
    FOR EACH ROW EXECUTE FUNCTION public.touch_world_cup_updated_at();

DROP TRIGGER IF EXISTS world_cup_predictions_touch_updated_at ON public.world_cup_predictions;
CREATE TRIGGER world_cup_predictions_touch_updated_at
    BEFORE UPDATE ON public.world_cup_predictions
    FOR EACH ROW EXECUTE FUNCTION public.touch_world_cup_updated_at();

INSERT INTO public.world_cup_events (
    slug,
    title,
    subtitle,
    prize_amount,
    status,
    closes_at
) VALUES (
    'world-cup-2026',
    'ทายแชมป์ฟุตบอลโลก 2026',
    'เลือกทีมแชมป์ 1 ทีม ลุ้นเงินรางวัล 1,000 บาท ถ้าทายถูกหลายคน แบ่งรางวัลเท่ากัน',
    1000,
    'open',
    '2026-07-10 20:00:00+07'
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    prize_amount = EXCLUDED.prize_amount,
    status = EXCLUDED.status,
    closes_at = EXCLUDED.closes_at,
    updated_at = now();

WITH event_row AS (
    SELECT id FROM public.world_cup_events WHERE slug = 'world-cup-2026'
)
INSERT INTO public.world_cup_teams (
    event_id,
    team_name,
    team_name_en,
    flag_emoji,
    seed_order,
    accent_color,
    is_active
)
SELECT event_row.id, team_name, team_name_en, flag_emoji, seed_order, accent_color, true
FROM event_row
CROSS JOIN (VALUES
    ('ฝรั่งเศส', 'France', '🇫🇷', 10, '#2563eb'),
    ('โมร็อกโก', 'Morocco', '🇲🇦', 20, '#dc2626'),
    ('สเปน', 'Spain', '🇪🇸', 30, '#f59e0b'),
    ('เบลเยียม', 'Belgium', '🇧🇪', 40, '#facc15'),
    ('นอร์เวย์', 'Norway', '🇳🇴', 50, '#1d4ed8'),
    ('อังกฤษ', 'England', '🏴', 60, '#ef4444'),
    ('ทีมเข้ารอบ 7', 'Quarter-finalist 7', '🏆', 70, '#22c55e'),
    ('ทีมเข้ารอบ 8', 'Quarter-finalist 8', '🏆', 80, '#14b8a6')
) AS teams(team_name, team_name_en, flag_emoji, seed_order, accent_color)
ON CONFLICT (event_id, team_name) DO UPDATE SET
    team_name_en = EXCLUDED.team_name_en,
    flag_emoji = EXCLUDED.flag_emoji,
    seed_order = EXCLUDED.seed_order,
    accent_color = EXCLUDED.accent_color,
    is_active = EXCLUDED.is_active,
    updated_at = now();

COMMENT ON TABLE public.world_cup_events IS
    'Internal EBCI engagement events for World Cup champion prediction.';

COMMENT ON TABLE public.world_cup_predictions IS
    'One active champion prediction per employee per World Cup event.';
