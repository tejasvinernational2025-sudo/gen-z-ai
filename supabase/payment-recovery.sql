-- Payment recovery lookup used by the server after a delayed Razorpay callback.
create or replace function public.get_latest_open_payment_order_for_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_order private.payment_orders%rowtype;
begin
  select * into v_order
  from private.payment_orders
  where user_id = p_user_id
    and status = 'created'
  order by created_at desc
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'order_id', v_order.order_id,
    'user_id', v_order.user_id,
    'plan', v_order.plan,
    'amount', v_order.amount,
    'currency', v_order.currency,
    'validity_days', v_order.validity_days,
    'status', v_order.status,
    'payment_id', v_order.payment_id,
    'created_at', v_order.created_at
  );
end;
$$;

revoke all on function public.get_latest_open_payment_order_for_user(uuid) from public, anon, authenticated;
grant execute on function public.get_latest_open_payment_order_for_user(uuid) to service_role;
