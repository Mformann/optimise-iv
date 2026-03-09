import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
};

// Common validation schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['admin', 'doctor', 'reception', 'nurse', 'patient']),
  phone: z.string().optional(),
});

export const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['patient', 'doctor', 'nurse']).default('patient'),
  phone: z.string().optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  role: z.enum(['admin', 'doctor', 'reception', 'nurse', 'patient']).optional(),
  phone: z.string().optional(),
  is_active: z.boolean().optional(),
});

export const createClinicSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  phone: z.string().min(5, 'Phone is required'),
  email: z.string().email('Invalid email format').optional(),
});

export const updateClinicSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  address: z.string().min(5, 'Address is required').optional(),
  city: z.string().min(2, 'City is required').optional(),
  phone: z.string().min(5, 'Phone is required').optional(),
  email: z.string().email('Invalid email format').optional(),
  is_active: z.boolean().optional(),
});

export const createPatientSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email format').optional().nullable(),
  phone: z.string().min(5, 'Phone is required'),
  date_of_birth: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  medical_notes: z.string().optional().nullable(),
  referral_source_id: z.string().uuid().optional().nullable(),
  referred_by_patient_id: z.string().uuid().optional().nullable(),
  partner_id: z.string().uuid().optional().nullable(),
});

export const createAppointmentSchema = z.object({
  patient_id: z.string().uuid(),
  doctor_id: z.string().uuid(),
  clinic_id: z.string().uuid(),
  therapy_id: z.string().uuid().optional().nullable(),
  type: z.enum(['consulting', 'drip']),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  duration_minutes: z.number().positive().optional(),
  is_quick: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export const createTherapySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional().nullable(),
  duration_minutes: z.number().positive('Duration must be positive'),
  price: z.number().min(0, 'Price cannot be negative'),
});

export const createPartnerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  contact_name: z.string().optional().nullable(),
  email: z.string().email('Invalid email format').optional().nullable(),
  phone: z.string().optional().nullable(),
  commission_type: z.enum(['percentage', 'fixed']),
  commission_value: z.number().min(0, 'Commission value cannot be negative'),
});

export const createReferralSourceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional().nullable(),
});

export const createReferralSchemeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional().nullable(),
  reward_type: z.enum(['discount', 'free_therapy', 'cash']),
  reward_value: z.number().min(0, 'Reward value cannot be negative'),
  min_referrals: z.number().positive('Minimum referrals must be positive'),
});

export const createDripOrderSchema = z.object({
  patient_id: z.string().uuid(),
  drip_id: z.string().uuid(),
  quantity: z.number().positive('Quantity must be positive'),
  clinic_id: z.string().uuid(),
  appointment_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const createBatchDripOrderSchema = z.object({
  patient_id: z.string().uuid(),
  clinic_id: z.string().uuid(),
  appointment_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  drips: z.array(z.object({
    drip_id: z.string().uuid(),
    quantity: z.number().positive('Quantity must be positive'),
  })).min(1, 'At least one drip is required'),
});

export const deliverDripOrderSchema = z.object({
  delivery_notes: z.string().optional().nullable(),
  payment: z.object({
    use_credits: z.boolean().optional(),
    use_wallet: z.boolean().optional(),
    wallet_amount: z.number().optional(),
    cash_amount: z.number().optional(),
    card_amount: z.number().optional(),
    pay_later: z.boolean().optional(),
  }).optional(),
});

export const createOfferSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional().nullable(),
  type: z.enum(['money', 'drip']),
  cost: z.number().min(0, 'Cost cannot be negative'),
  value: z.number().min(0).optional().nullable(),
  drip_id: z.string().optional().nullable(),
  drip_quantity: z.number().positive().optional().nullable(),
  expires_at_pattern: z.string().optional().nullable(),
  code: z.string().optional().nullable(),
  fixed_value: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.type === 'money') return data.value !== undefined && data.value !== null && data.value > 0;
    return true;
  },
  { message: 'Money-type offers require a positive value', path: ['value'] }
).refine(
  (data) => {
    if (data.type === 'drip') return data.drip_id && data.drip_quantity && data.drip_quantity > 0;
    return true;
  },
  { message: 'Drip-type offers require drip_id and drip_quantity', path: ['drip_id'] }
);

export const redeemOfferSchema = z.object({
  patient_id: z.string(),
  payment_method: z.enum(['cash', 'card', 'transfer']),
  custom_cost: z.number().min(0).optional(),
  appointment_id: z.string().optional(),
});
