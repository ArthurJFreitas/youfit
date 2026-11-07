import { describe, expect, it } from 'vitest';
import { editableFields } from './mutations';
describe('admin writes',()=>{
  it('never overwrites live reservations with a stale calendar snapshot',()=>{
    expect(editableFields({id:'day',capacity:24,enabled:true,reserved_quantity:2,created_at:'old',updated_at:'old'})).toEqual({capacity:24,enabled:true});
  });
});
