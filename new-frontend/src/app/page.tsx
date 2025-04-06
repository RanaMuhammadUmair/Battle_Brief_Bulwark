"use client";
import React, { useState, useEffect } from 'react';
import MainPage from '../../components/MainPage';
import { useRouter } from 'next/navigation';

const HomePage = () => {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      router.push('/login');
    }
  }, [router]);

  if (!user) {
    return null; // or a loading indicator
  }

  return <MainPage user={user} />;
};

export default HomePage;
