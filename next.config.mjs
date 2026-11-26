/** @type {import('next').NextConfig} */
import nextPWA from '@ducanh2912/next-pwa';

const withPWA = nextPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  importScripts: ['/firebase-messaging-sw.js'],
});

const nextConfig = {
  // Your Next.js config options here
};

export default withPWA(nextConfig);
