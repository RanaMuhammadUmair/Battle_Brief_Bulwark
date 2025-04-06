"use client";
import React, { useState, useEffect } from 'react';
import HistoryPage from '../../components/HistoryPage';
import { useRouter } from 'next/navigation';

const History = () => {
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

  return <HistoryPage user={user} />;
};

export default History;
