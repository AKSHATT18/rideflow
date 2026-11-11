import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Navigation, Eye, EyeOff, Car, User as UserIcon } from 'lucide-react';
import { registerSchema } from '../lib/validations';
import type { RegisterFormValues } from '../lib/validations';
import { FormInput } from '../components/ui/FormInput';
import { Button } from '../components/Button';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/axios';
import axios from 'axios';
import { cn } from '../lib/utils';

export const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { checkAuth } = useAuthStore();
  
  const { register, handleSubmit, formState: { errors, isSubmitting }, watch, setValue } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'PASSENGER'
    }
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      setServerError(null);
      await api.post('/auth/register', data);
      await checkAuth();
      navigate('/');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        setServerError(error.response.data.message || 'Registration failed.');
      } else {
        setServerError('Something went wrong. Please try again later.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center shadow-sm">
            <Navigation className="w-6 h-6 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Create an account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Join RideFlow today and experience the difference.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-2xl sm:px-10 border border-gray-100">
          
          <div className="mb-8">
            <label className="text-sm font-medium text-gray-700 block mb-3">I want to sign up as a:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setValue('role', 'PASSENGER')}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all",
                  selectedRole === 'PASSENGER' ? "border-brand-600 bg-brand-50" : "border-gray-200 hover:border-brand-300"
                )}
              >
                <UserIcon className={cn("w-8 h-8 mb-2", selectedRole === 'PASSENGER' ? "text-brand-600" : "text-gray-400")} />
                <span className={cn("font-medium", selectedRole === 'PASSENGER' ? "text-brand-900" : "text-gray-600")}>Passenger</span>
              </button>
              
              <button
                type="button"
                onClick={() => setValue('role', 'DRIVER')}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all",
                  selectedRole === 'DRIVER' ? "border-brand-600 bg-brand-50" : "border-gray-200 hover:border-brand-300"
                )}
              >
                <Car className={cn("w-8 h-8 mb-2", selectedRole === 'DRIVER' ? "text-brand-600" : "text-gray-400")} />
                <span className={cn("font-medium", selectedRole === 'DRIVER' ? "text-brand-900" : "text-gray-600")}>Driver</span>
              </button>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {serverError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">
                {serverError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormInput
                label="First name"
                placeholder="Jane"
                {...register('firstName')}
                error={errors.firstName?.message}
              />
              <FormInput
                label="Last name"
                placeholder="Doe"
                {...register('lastName')}
                error={errors.lastName?.message}
              />
            </div>

            <FormInput
              label="Email address"
              type="email"
              placeholder="name@example.com"
              {...register('email')}
              error={errors.email?.message}
            />

            <FormInput
              label="Phone number"
              placeholder="+1 (555) 000-0000"
              {...register('phone')}
              error={errors.phone?.message}
            />

            <div className="relative">
              <FormInput
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                {...register('password')}
                error={errors.password?.message}
              />
              <button
                type="button"
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            <FormInput
              label="Confirm Password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              {...register('confirmPassword')}
              error={errors.confirmPassword?.message}
            />

            <Button type="submit" className="w-full h-12 mt-6" loading={isSubmitting}>
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-brand-600 hover:text-brand-500 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
