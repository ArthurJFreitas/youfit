import { beforeEach, describe, expect, it, vi } from 'vitest';
const { rpc } = vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('./client',()=>({getSupabase:()=>({rpc})}));
import { createOrder } from './order-repository';
import type { OrderDraft } from '@/features/ordering/types';
const draft: OrderDraft = {customer:{name:'Nome editado',phone:'5511999999999'},address:{street:'Rua editada',number:'2',neighborhood:'Centro'},deliveries:[{deliveryDayId:'day-id',items:[{productId:'product-id',quantity:2,comboId:'combo-id'}]}]};
describe('createOrder boundary',()=>{
  beforeEach(()=>rpc.mockReset());
  it('serializes identifiers without client prices and maps the authoritative saved receipt on retry',async()=>{
    rpc.mockResolvedValue({error:null,data:{order_id:'order-id',order_number:'YF-000001',status:'awaiting_pix',customer:{name:'Nome salvo',phone:'+5511999999999'},address:{street:'Rua salva',number:'1',neighborhood:'Centro'},subtotal_cents:5000,discount_cents:500,delivery_fee_cents:600,total_cents:5100,deliveries:[{delivery_date:'2026-11-09',fee_cents:600,items:[{product_name:'Salada',unit_price_cents:2500,quantity:2,line_total_cents:5000}]}]}});
    const receipt=await createOrder(draft,'retry-key');
    expect(receipt.customer.name).toBe('Nome salvo');
    expect(receipt.address.street).toBe('Rua salva');
    expect(receipt.totalCents).toBe(5100);
    expect(receipt.deliveries[0].items[0].quantity).toBe(2);
    expect(rpc).toHaveBeenCalledWith('create_order',{idempotency_key:'retry-key',payload:{customer:draft.customer,address:draft.address,notes:undefined,deliveries:[{delivery_day_id:'day-id',items:[{product_id:'product-id',quantity:2,combo_id:'combo-id',notes:undefined}]}]}});
  });
  it('turns lowercase database availability errors into useful correction instructions',async()=>{
    rpc.mockResolvedValue({data:null,error:{message:'delivery day is full'}});
    await expect(createOrder(draft,'key')).rejects.toThrow('indisponível');
  });
});
