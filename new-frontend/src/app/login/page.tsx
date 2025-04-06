"use client";
import React from 'react';
import Login from '../../components/Login';
import { useRouter } from 'next/navigation';

const LoginPage = () => {
  const router = useRouter();

  const handleLogin = (userData: any) => {
    localStorage.setItem('user', JSON.stringify(userData));
    router.push('/');
  };

  return <Login onLogin={handleLogin} />;
};

export default LoginPage;
