import { describe, it, expect } from 'vitest';
import { signupScholar, signupInstitution, loginWithPassword } from '@/lib/auth/auth-actions';

describe('Authentication Actions & Input Validation', () => {
  it('rejects scholar registration with missing required fields', async () => {
    const res1 = await signupScholar({
      email: '',
      password: 'password123',
      fullName: 'Dr. Test',
    });
    expect(res1.success).toBe(false);
    expect(res1.error).toBe('Name, email, and password are required.');

    const res2 = await signupScholar({
      email: 'test@seminary.edu',
      password: 'short',
      fullName: 'Dr. Test',
    });
    expect(res2.success).toBe(false);
    expect(res2.error).toBe('Password must be at least 8 characters long.');
  });

  it('rejects institution registration with missing required fields', async () => {
    const res = await signupInstitution({
      email: 'dean@seminary.edu',
      password: 'password123',
      fullName: 'Dean Smith',
      institutionName: '', // Missing
    });
    expect(res.success).toBe(false);
    expect(res.error).toBe('Full name, institutional email, institution name, and password are required.');
  });

  it('validates required fields on loginWithPassword', async () => {
    const formData = new FormData();
    formData.append('email', '');
    formData.append('password', '');

    const result = await loginWithPassword(formData);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Email and password are required.');
  });
});
