-- ==============================================================================
-- FaithFull Scholars — Migration 20260922000000: Subscriptions & Booking Contracts
-- Implements:
--   1. Tiered Institutional Subscriptions (institution_subscriptions / ADR 0010)
--   2. Structured Institutional Engagement Contracts (institution_contracts / ADR 0011)
--   3. Engagement Contract Milestones (contract_milestones / ADR 0011)
-- Full compliance with Supabase Security Advisor (Splinter) and 100% RLS
-- ==============================================================================

-- 1. Create table for Tiered Institutional Subscriptions (ADR 0010)
CREATE TABLE IF NOT EXISTS public.institution_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    tier TEXT NOT NULL DEFAULT 'basic' CHECK (tier IN ('basic', 'verified_seminary', 'premier_partner')),
    billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
    seats_limit INTEGER NOT NULL DEFAULT 1,
    monthly_inquiry_limit INTEGER NOT NULL DEFAULT 5,
    inquiries_used_current_month INTEGER NOT NULL DEFAULT 0,
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_institution_subscription UNIQUE (institution_id)
);

-- Covering indexes on foreign keys (Splinter 0001)
CREATE INDEX IF NOT EXISTS idx_institution_subscriptions_institution_id ON public.institution_subscriptions (institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_subscriptions_tier ON public.institution_subscriptions (tier);
CREATE INDEX IF NOT EXISTS idx_institution_subscriptions_status ON public.institution_subscriptions (status);

-- Updated_at trigger
DROP TRIGGER IF EXISTS set_institution_subscriptions_updated_at ON public.institution_subscriptions;
CREATE TRIGGER set_institution_subscriptions_updated_at
    BEFORE UPDATE ON public.institution_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Enable and Force RLS
ALTER TABLE public.institution_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_subscriptions FORCE ROW LEVEL SECURITY;

-- Subscriptions Policies
CREATE POLICY "Institution users can view their own subscription"
ON public.institution_subscriptions
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.institution_users iu
        WHERE iu.institution_id = institution_subscriptions.institution_id
          AND iu.account_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Institution users can update their own subscription tier"
ON public.institution_subscriptions
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.institution_users iu
        WHERE iu.institution_id = institution_subscriptions.institution_id
          AND iu.account_id = (SELECT auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.institution_users iu
        WHERE iu.institution_id = institution_subscriptions.institution_id
          AND iu.account_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Admins can manage all subscriptions"
ON public.institution_subscriptions
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- 2. Create table for Institutional Engagement Contracts (ADR 0011)
CREATE TABLE IF NOT EXISTS public.institution_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE RESTRICT,
    scholar_id UUID NOT NULL REFERENCES public.scholars(id) ON DELETE RESTRICT,
    inquiry_id UUID REFERENCES public.inquiries(id) ON DELETE SET NULL,
    opportunity_type TEXT NOT NULL CHECK (
        opportunity_type IN (
            'adjunct_course',
            'modular_intensive',
            'guest_lecture',
            'curriculum_review',
            'speaking_engagement',
            'doctoral_supervision',
            'other'
        )
    ),
    title TEXT NOT NULL,
    scope_of_work TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    total_compensation_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    currency TEXT NOT NULL DEFAULT 'USD',
    payment_terms TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (
        status IN ('draft', 'offered', 'accepted', 'in_progress', 'completed', 'declined', 'cancelled')
    ),
    institution_notes TEXT,
    scholar_notes TEXT,
    created_by UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Covering indexes on foreign keys (Splinter 0001)
CREATE INDEX IF NOT EXISTS idx_institution_contracts_institution_id ON public.institution_contracts (institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_contracts_scholar_id ON public.institution_contracts (scholar_id);
CREATE INDEX IF NOT EXISTS idx_institution_contracts_inquiry_id ON public.institution_contracts (inquiry_id);
CREATE INDEX IF NOT EXISTS idx_institution_contracts_created_by ON public.institution_contracts (created_by);
CREATE INDEX IF NOT EXISTS idx_institution_contracts_status ON public.institution_contracts (status);

-- Updated_at trigger
DROP TRIGGER IF EXISTS set_institution_contracts_updated_at ON public.institution_contracts;
CREATE TRIGGER set_institution_contracts_updated_at
    BEFORE UPDATE ON public.institution_contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Enable and Force RLS
ALTER TABLE public.institution_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_contracts FORCE ROW LEVEL SECURITY;

-- Contracts Policies
CREATE POLICY "Institution users can view their own contracts"
ON public.institution_contracts
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.institution_users iu
        WHERE iu.institution_id = institution_contracts.institution_id
          AND iu.account_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Scholars can view their assigned contracts"
ON public.institution_contracts
FOR SELECT
TO authenticated
USING (
    scholar_id = (SELECT public.get_current_scholar_id())
);

CREATE POLICY "Institution users can insert contracts"
ON public.institution_contracts
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.institution_users iu
        WHERE iu.institution_id = institution_contracts.institution_id
          AND iu.account_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Institution users can update their own contracts"
ON public.institution_contracts
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.institution_users iu
        WHERE iu.institution_id = institution_contracts.institution_id
          AND iu.account_id = (SELECT auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.institution_users iu
        WHERE iu.institution_id = institution_contracts.institution_id
          AND iu.account_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Scholars can update assigned contract responses"
ON public.institution_contracts
FOR UPDATE
TO authenticated
USING (
    scholar_id = (SELECT public.get_current_scholar_id())
)
WITH CHECK (
    scholar_id = (SELECT public.get_current_scholar_id())
);

CREATE POLICY "Admins can manage all contracts"
ON public.institution_contracts
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- 3. Create table for Contract Milestones (ADR 0011)
CREATE TABLE IF NOT EXISTS public.contract_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.institution_contracts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    compensation_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'verified', 'paid')),
    display_order INTEGER NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Covering indexes on foreign keys (Splinter 0001)
CREATE INDEX IF NOT EXISTS idx_contract_milestones_contract_id ON public.contract_milestones (contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_milestones_status ON public.contract_milestones (status);

-- Updated_at trigger
DROP TRIGGER IF EXISTS set_contract_milestones_updated_at ON public.contract_milestones;
CREATE TRIGGER set_contract_milestones_updated_at
    BEFORE UPDATE ON public.contract_milestones
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Enable and Force RLS
ALTER TABLE public.contract_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_milestones FORCE ROW LEVEL SECURITY;

-- Milestones Policies
CREATE POLICY "Institution users can view milestones of their contracts"
ON public.contract_milestones
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.institution_contracts ic
        JOIN public.institution_users iu ON iu.institution_id = ic.institution_id
        WHERE ic.id = contract_milestones.contract_id
          AND iu.account_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Scholars can view milestones of their assigned contracts"
ON public.contract_milestones
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.institution_contracts ic
        WHERE ic.id = contract_milestones.contract_id
          AND ic.scholar_id = (SELECT public.get_current_scholar_id())
    )
);

CREATE POLICY "Institution users can insert milestones"
ON public.contract_milestones
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.institution_contracts ic
        JOIN public.institution_users iu ON iu.institution_id = ic.institution_id
        WHERE ic.id = contract_milestones.contract_id
          AND iu.account_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Institution users can update milestones"
ON public.contract_milestones
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.institution_contracts ic
        JOIN public.institution_users iu ON iu.institution_id = ic.institution_id
        WHERE ic.id = contract_milestones.contract_id
          AND iu.account_id = (SELECT auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.institution_contracts ic
        JOIN public.institution_users iu ON iu.institution_id = ic.institution_id
        WHERE ic.id = contract_milestones.contract_id
          AND iu.account_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Scholars can update milestones on assigned contracts"
ON public.contract_milestones
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.institution_contracts ic
        WHERE ic.id = contract_milestones.contract_id
          AND ic.scholar_id = (SELECT public.get_current_scholar_id())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.institution_contracts ic
        WHERE ic.id = contract_milestones.contract_id
          AND ic.scholar_id = (SELECT public.get_current_scholar_id())
    )
);

CREATE POLICY "Institution users can delete milestones"
ON public.contract_milestones
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.institution_contracts ic
        JOIN public.institution_users iu ON iu.institution_id = ic.institution_id
        WHERE ic.id = contract_milestones.contract_id
          AND iu.account_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Admins can manage all milestones"
ON public.contract_milestones
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
