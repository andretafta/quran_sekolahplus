/** @type {import('next').NextConfig} */
const nextConfig = {
  // --- TAMBAHKAN DUA BAGIAN INI ---
  typescript: {
    // Mengabaikan error TypeScript (seperti tipe data yang salah)
    ignoreBuildErrors: true,
  },
  eslint: {
    // Mengabaikan error ESLint (seperti 'any' atau unused variables)
    ignoreDuringBuilds: true,
  },
  // -------------------------------

  // Konfigurasi kamu yang lain (misalnya output: 'export' untuk GitHub Pages)
  output: 'export',
};

export default nextConfig;
