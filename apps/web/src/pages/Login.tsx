import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Navigation, Eye, EyeOff } from 'lucide-react';
import { loginSchema } from '../lib/validations';
import type { LoginFormValues } from '../lib/validations';
import { FormInput } from '../components/ui/FormInput';
import { Button } from '../components/Button';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/axios';
import axios from 'axios';

export const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { checkAuth } = useAuthStore();
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setServerError(null);
      await api.post('/auth/login', data);
      await checkAuth();
      navigate('/'); // App.tsx will route them based on role if logged in
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        setServerError(error.response.data.message || 'Invalid email or password.');
      } else {
        setServerError('Something went wrong. Please try again later.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center shadow-sm">
            <Navigation className="w-6 h-6 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Welcome back
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Your next ride is just a few clicks away.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            
            {serverError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">
                {serverError}
              </div>
            )}

            <FormInput
              label="Email address"
              type="email"
              placeholder="name@example.com"
              {...register('email')}
              error={errors.email?.message}
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

            <Button type="submit" className="w-full h-12" loading={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-brand-600 hover:text-brand-500 transition-colors">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
