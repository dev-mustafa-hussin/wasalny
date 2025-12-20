-- Create chat_rooms table
CREATE TABLE IF NOT EXISTS public.chat_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id),
    customer_id UUID NOT NULL REFERENCES auth.users(id),
    driver_id UUID NOT NULL REFERENCES public.drivers(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(order_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES public.chat_rooms(id),
    sender_id UUID REFERENCES auth.users(id), -- Nullable for system messages
    content TEXT,
    msg_type TEXT DEFAULT 'text' CHECK (msg_type IN ('text', 'image', 'system_pickup', 'system_tracking')),
    metadata JSONB DEFAULT '{}'::jsonb,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies for chat_rooms
CREATE POLICY "Users can view their own chat rooms"
ON public.chat_rooms FOR SELECT
USING (
    auth.uid() = customer_id OR 
    auth.uid() IN (SELECT id FROM public.drivers WHERE id = driver_id)
);

-- Policies for messages
CREATE POLICY "Users can view messages in their rooms"
ON public.messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.chat_rooms
        WHERE id = messages.room_id
        AND (
            customer_id = auth.uid() OR
            driver_id IN (SELECT id FROM public.drivers WHERE id = auth.uid()) -- Driver check might need adjustment if auth.uid() matches driver.id directly?
            -- Wait, drivers table id IS auth.uid() usually. Let's assume strict 1:1 for now or check previous schema.
            -- In previous migrations: "drivers.id references auth.users(id)". So driver_id IS auth.uid().
        )
    )
);

CREATE POLICY "Users can insert messages in their rooms"
ON public.messages FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.chat_rooms
        WHERE id = messages.room_id
        AND (
            customer_id = auth.uid() OR
            driver_id = auth.uid()
        )
    )
);

-- Allow system messages (service_role only? or triggers?)
-- For now, we rely on the backend scripts running as postgres/service_role to insert system messages.
-- Or if we use RLS for system messages, we might need a bypass.
