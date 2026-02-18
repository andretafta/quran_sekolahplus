'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  Search,
  BookOpen,
  Star,
  Moon,
  Sun,
  Menu,
  X,
  Share2,
  Download,
  MoreVertical,
  BookMarked,
  Repeat,
  Repeat1,
  StopCircle,
  ShareIcon,
  Loader2,
  Stars,
} from 'lucide-react';
import ShareAyahModal from '@/components/ShareAyahModal';

interface Surah {
  number: number;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

interface Ayah {
  number: number;
  numberInSurah: number;
  juz: number;
  page: number;
  text: string;
  sajda: boolean;
  translation?: string;
}

interface SurahData {
  number: number;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
  ayahs: Ayah[];
}

interface Edition {
  identifier: string;
  language: string;
  type: string;
  name: string;
}

interface SearchSuggestion {
  type: 'surah' | 'juz' | 'page' | 'ayah';
  title: string;
  subtitle: string;
  action: () => void;
}

interface AudioReciter {
  identifier: string;
  name: string;
  englishName: string;
}

const audioReciters: AudioReciter[] = [
  {
    identifier: 'ar.alafasy',
    name: 'Mishary Rashid Alafasy',
    englishName: 'Mishary Rashid Alafasy',
  },
  {
    identifier: 'ar.abdulbasitmurattal',
    name: 'AbdulBaset AbdulSamad',
    englishName: 'AbdulBaset AbdulSamad',
  },
  {
    identifier: 'ar.saudalshuraim',
    name: "Sa'ud al-Shuraym",
    englishName: "Sa'ud al-Shuraym",
  },
  {
    identifier: 'ar.abdullahbasfar',
    name: 'Abdullah Basfar',
    englishName: 'Abdullah Basfar',
  },
  {
    identifier: 'ar.muhammadayyub',
    name: 'Mohammad Ayyub',
    englishName: 'Mohammad Ayyub',
  },
];

const getPrayerNames = (edition: string) => {
  const translations = {
    'id.indonesian': {
      Fajr: 'Subuh',
      Dhuhr: 'Dzuhur',
      Asr: 'Ashar',
      Maghrib: 'Maghrib',
      Isha: 'Isya',
    },
    'en.sahih': {
      Fajr: 'Fajr',
      Dhuhr: 'Dhuhr',
      Asr: 'Asr',
      Maghrib: 'Maghrib',
      Isha: 'Isha',
    },
    'ja.japanese': {
      Fajr: 'ファジュル',
      Dhuhr: 'ズフル',
      Asr: 'アスル',
      Maghrib: 'マグリブ',
      Isha: 'イシャー',
    },
  };
  return (
    translations[edition as keyof typeof translations] ||
    translations['en.sahih']
  );
};
const surahNamesIndonesian: Record<number, string> = {
  1: 'Al-Fatihah',
  2: 'Al-Baqarah',
  3: "Ali 'Imran",
  4: "An-Nisa'",
  5: "Al-Ma'idah",
  6: "Al-An'am",
  7: "Al-A'raf",
  8: 'Al-Anfal',
  9: 'At-Taubah',
  10: 'Yunus',
  11: 'Hud',
  12: 'Yusuf',
  13: "Ar-Ra'd",
  14: 'Ibrahim',
  15: 'Al-Hijr',
  16: 'An-Nahl',
  17: "Al-Isra'",
  18: 'Al-Kahf',
  19: 'Maryam',
  20: 'Ta Ha',
  21: "Al-Anbiya'",
  22: 'Al-Hajj',
  23: "Al-Mu'minun",
  24: 'An-Nur',
  25: 'Al-Furqan',
  26: "Asy-Syu'ara'",
  27: 'An-Naml',
  28: 'Al-Qasas',
  29: "Al-'Ankabut",
  30: 'Ar-Rum',
  31: 'Luqman',
  32: 'As-Sajdah',
  33: 'Al-Ahzab',
  34: "Saba'",
  35: 'Fatir',
  36: 'Ya Sin',
  37: 'As-Saffat',
  38: 'Sad',
  39: 'Az-Zumar',
  40: 'Ghafir',
  41: 'Fushshilat',
  42: 'Asy-Syura',
  43: 'Az-Zukhruf',
  44: 'Ad-Dukhan',
  45: 'Al-Jatsiyah',
  46: 'Al-Ahqaf',
  47: 'Muhammad',
  48: 'Al-Fath',
  49: 'Al-Hujurat',
  50: 'Qaf',
  51: 'Adz-Dzariyat',
  52: 'At-Tur',
  53: 'An-Najm',
  54: 'Al-Qamar',
  55: 'Ar-Rahman',
  56: "Al-Waqi'ah",
  57: 'Al-Hadid',
  58: 'Al-Mujadilah',
  59: 'Al-Hasyr',
  60: 'Al-Mumtahanah',
  61: 'As-Saff',
  62: "Al-Jumu'ah",
  63: 'Al-Munafiqun',
  64: 'At-Taghabun',
  65: 'At-Talaq',
  66: 'At-Tahrim',
  67: 'Al-Mulk',
  68: 'Al-Qalam',
  69: 'Al-Haqqah',
  70: "Al-Ma'arij",
  71: 'Nuh',
  72: 'Al-Jin',
  73: 'Al-Muzzammil',
  74: 'Al-Muddassir',
  75: 'Al-Qiyamah',
  76: 'Al-Insan',
  77: 'Al-Mursalat',
  78: "An-Naba'",
  79: "An-Nazi'at",
  80: "'Abasa",
  81: 'At-Takwir',
  82: 'Al-Infitar',
  83: 'Al-Mutaffifin',
  84: 'Al-Insyiqaq',
  85: 'Al-Buruj',
  86: 'At-Tariq',
  87: "Al-A'la",
  88: 'Al-Ghasyiyah',
  89: 'Al-Fajr',
  90: 'Al-Balad',
  91: 'Asy-Syams',
  92: 'Al-Lail',
  93: 'Adh-Dhuha',
  94: 'Al-Insyirah',
  95: 'At-Tin',
  96: "Al-'Alaq",
  97: 'Al-Qadr',
  98: 'Al-Bayyinah',
  99: 'Al-Zalzalah',
  100: "Al-'Adiyat",
  101: "Al-Qari'ah",
  102: 'At-Takatsur',
  103: "Al-'Asr",
  104: 'Al-Humazah',
  105: 'Al-Fil',
  106: 'Quraisy',
  107: "Al-Ma'un",
  108: 'Al-Kautsar',
  109: 'Al-Kafirun',
  110: 'An-Nashr',
  111: 'Al-Lahab',
  112: 'Al-Ikhlas',
  113: 'Al-Falaq',
  114: 'An-Nas',
};

const surahMeansIndonesian: Record<number, string> = {
  1: 'Pembukaan',
  2: 'Sapi Betina',
  3: 'Keluarga Imran',
  4: 'Wanita',
  5: 'Hidangan',
  6: 'Binatang Ternak',
  7: 'Tempat yang Tinggi',
  8: 'Rampasan Perang',
  9: 'Pengampunan',
  10: 'Nabi Yunus',
  11: 'Nabi Hud',
  12: 'Nabi Yusuf',
  13: 'Guruh',
  14: 'Nabi Ibrahim',
  15: 'Gunung Al-Hijr',
  16: 'Lebah',
  17: 'Perjalanan Malam Hari',
  18: 'Gua',
  19: 'Maryam',
  20: 'Ta Ha',
  21: 'Para Nabi',
  22: 'Haji',
  23: 'Orang-Orang Mukmin',
  24: 'Cahaya',
  25: 'Pembeda',
  26: 'Para Penyair',
  27: 'Semut',
  28: 'Kisah-kisah',
  29: 'Laba-Laba',
  30: 'Bangsa Romawi',
  31: 'Luqman',
  32: 'Sajdah',
  33: 'Golongan yang Bersekutu',
  34: "Kaum Saba'",
  35: 'Yang Maha Pencipta',
  36: 'Ya Sin',
  37: 'Barisan-barisan',
  38: 'Sad',
  39: 'Rombongan-rombongan',
  40: 'Yang Mengampuni',
  41: 'Yang Dijelaskan',
  42: 'Musyawarah',
  43: 'Perhiasan',
  44: 'Kabut',
  45: 'Yang Bertekuk Lutut',
  46: 'Bukit-bukit Pasir',
  47: 'Nabi Muhammad',
  48: 'Kemenangan',
  49: 'Kamar-kamar',
  50: 'Qaf',
  51: 'Angin yang Menerbangkan',
  52: 'Bukit',
  53: 'Bintang',
  54: 'Bulan',
  55: 'Yang Maha Pengasih',
  56: 'Hari Kiamat yang Pasti Terjadi',
  57: 'Besi',
  58: 'Gugatan',
  59: 'Pengusiran',
  60: 'Wanita yang Diuji',
  61: 'Barisan',
  62: "Hari Jum'at",
  63: 'Orang-orang Munafik',
  64: 'Hari Ditampakkan Kesalahan',
  65: 'Talak',
  66: 'Mengharamkan',
  67: 'Kerajaan',
  68: 'Pena',
  69: 'Hari Kiamat',
  70: 'Tempat Naik',
  71: 'Nabi Nuh',
  72: 'Jin',
  73: 'Orang yang Berselimut',
  74: 'Orang yang Berkemul',
  75: 'Hari Kiamat',
  76: 'Manusia',
  77: 'Malaikat yang Diutus',
  78: 'Berita Besar',
  79: 'Malaikat yang Mencabut',
  80: 'Bermuka Masam',
  81: 'Menggulung',
  82: 'Terbelah',
  83: 'Orang-orang yang Curang',
  84: 'Terbelah',
  85: 'Gugusan Bintang',
  86: 'Yang Datang di Malam Hari',
  87: 'Yang Paling Tinggi',
  88: 'Hari Pembalasan',
  89: 'Fajar',
  90: 'Negeri',
  91: 'Matahari',
  92: 'Malam',
  93: 'Waktu Duha',
  94: 'Pelapangan',
  95: 'Buah Tin',
  96: 'Segumpal Darah',
  97: 'Kemuliaan',
  98: 'Bukti Nyata',
  99: 'Guncangan',
  100: 'Kuda Perang yang Berlari Kencang',
  101: 'Hari Kiamat yang Menggetarkan',
  102: 'Bermegah-megahan',
  103: 'Masa/Waktu',
  104: 'Pengumpat',
  105: 'Gajah',
  106: 'Suku Quraisy',
  107: 'Barang-barang yang Berguna',
  108: 'Nikmat yang Banyak',
  109: 'Orang-orang Kafir',
  110: 'Pertolongan',
  111: 'Gejolak Api',
  112: 'Memurnikan Keesaan Allah',
  113: 'Waktu Subuh',
  114: 'Manusia',
};

const cities = [
  'Ambon',
  'Balikpapan',
  'Banda Aceh',
  'Bandar Lampung',
  'Bandung',
  'Banjarbaru',
  'Banjarmasin',
  'Batam',
  'Bekasi',
  'Bengkulu',
  'Bogor',
  'Cirebon',
  'Denpasar',
  'Depok',
  'Gorontalo',
  'Jakarta',
  'Jambi',
  'Jayapura',
  'Kendari',
  'Kupang',
  'Makassar',
  'Malang',
  'Manado',
  'Mataram',
  'Medan',
  'Padang',
  'Palangkaraya',
  'Palembang',
  'Palu',
  'Pekanbaru',
  'Pontianak',
  'Samarinda',
  'Semarang',
  'Serang',
  'Solo',
  'Surabaya',
  'Tangerang',
  'Tanjungpinang',
  'Ternate',
  'Yogyakarta',
];

export default function QuranReader() {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [currentSurah, setCurrentSurah] = useState<SurahData | null>(null);
  const [translations, setTranslations] = useState<SurahData | null>(null);
  const [editions, setEditions] = useState<Edition[]>([]);
  const [selectedEdition, setSelectedEdition] = useState('id.indonesian');
  const [audioEdition, setAudioEditionState] = useState('ar.alafasy');
  const [currentAyah, setCurrentAyah] = useState<number>(1);
  const [repeatSurah, setRepeatSurah] = useState(false);
  const [repeatAyah, setRepeatAyah] = useState<Record<number, boolean>>({});
  const [isStopped, setIsStopped] = useState(true); // true = belum mulai / sudah di-stop
  const [isSurahLoading, setIsSurahLoading] = useState(false);

  const [isMainPlaying, setIsMainPlaying] = useState(false);
  const [isAyahPlaying, setIsAyahPlaying] = useState(false);
  const [currentPlayingAyah, setCurrentPlayingAyah] = useState<number | null>(
    null
  );

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [randomAyah, setRandomAyah] = useState<Ayah | null>(null);
  const [randomAyahTranslation, setRandomAyahTranslation] = useState('');

  const [bookmark, setBookmark] = useState<{
    surah: number;
    ayah: number;
  } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fontSize, setFontSize] = useState('18');
  const [loading, setLoading] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);

  const [shareOpen, setShareOpen] = useState(false);
  const [selectedAyah, setSelectedAyah] = useState<any>(null);

  const [searchSuggestions, setSearchSuggestions] = useState<
    SearchSuggestion[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedAyah, setHighlightedAyah] = useState<number | null>(null);

  const [navigationMode, setNavigationMode] = useState<'surah' | 'juz'>(
    'surah'
  );
  const [juzList, setJuzList] = useState<any[]>([]);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  const [prayerTimes, setPrayerTimes] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('Jakarta');
  const [errorMsg, setErrorMsg] = useState<string | null>(null); // untuk error banner
  const [randomAyahSurahName, setRandomAyahSurahName] = useState('');

  const audioRef = useRef<HTMLAudioElement>(null);
  const ayahAudioRef = useRef<HTMLAudioElement>(null);
  const ayahRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchSurahs();
    fetchEditions();
    generateJuzList();
    loadBookmark();
    fetchPrayerTimes();
  }, []);

  useEffect(() => {
    if (surahs.length > 0) {
      fetchSurah(1);
    }
  }, [surahs]);

  useEffect(() => {
    fetchRandomAyah();
  }, [selectedEdition]); // Dependency array: fungsi ini akan berjalan setiap kali selectedEdition berubah

  useEffect(() => {
    if (currentSurah && selectedEdition) {
      fetchSurah(currentSurah.number);
    }
  }, [selectedEdition]);

  useEffect(() => {
    if (searchQuery.trim()) {
      generateSearchSuggestions(searchQuery);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchPrayerTimes();
  }, [selectedCity]);

  useEffect(() => {
    fetchRandomAyah();
  }, []);

  useEffect(() => {
    // hentikan pemutaran jika ganti qari agar tidak mismatch
    if (isMainPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsMainPlaying(false);
    }
    if (isAyahPlaying && ayahAudioRef.current) {
      ayahAudioRef.current.pause();
      setIsAyahPlaying(false);
      setCurrentPlayingAyah(null);
    }
  }, [audioEdition]);

  const fetchSurahs = async () => {
    try {
      const response = await fetch('https://api.alquran.cloud/v1/surah');
      const data = await response.json();
      setSurahs(data.data);
    } catch (error) {
      console.error('Error fetching surahs:', error);
    }
  };

  const fetchEditions = async () => {
    try {
      const response = await fetch('https://api.alquran.cloud/v1/edition');
      const data = await response.json();
      setEditions(
        data.data.filter(
          (edition: Edition) =>
            edition.type === 'translation' &&
            ['id', 'en', 'ja'].includes(edition.language)
        )
      );
    } catch (error) {
      console.error('Error fetching editions:', error);
    }
  };

  const generateJuzList = () => {
    const juzData = [];
    for (let i = 1; i <= 30; i++) {
      juzData.push({
        number: i,
        name: `Juz ${i}`,
        arabicName: `الجزء ${i}`,
      });
    }
    setJuzList(juzData);
  };

  const fetchSurah = async (surahNumber: number) => {
    setLoading(true);
    try {
      const arabicResponse = await fetch(
        `https://api.alquran.cloud/v1/surah/${surahNumber}/quran-uthmani`
      );
      const arabicData = await arabicResponse.json();
      setCurrentSurah(arabicData.data);

      const translationResponse = await fetch(
        `https://api.alquran.cloud/v1/surah/${surahNumber}/${selectedEdition}`
      );
      const translationData = await translationResponse.json();
      setTranslations(translationData.data);

      setCurrentAyah(1);
    } catch (error) {
      console.error('Error fetching surah:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJuz = async (juzNumber: number) => {
    setLoading(true);
    try {
      const arabicResponse = await fetch(
        `https://api.alquran.cloud/v1/juz/${juzNumber}/quran-uthmani`
      );
      const arabicData = await arabicResponse.json();

      const translationResponse = await fetch(
        `https://api.alquran.cloud/v1/juz/${juzNumber}/${selectedEdition}`
      );
      const translationData = await translationResponse.json();

      // Process juz data to match surah format
      const processedData = {
        number: juzNumber,
        englishName: `Juz ${juzNumber}`,
        englishNameTranslation: `Para ${juzNumber}`,
        numberOfAyahs: arabicData.data.ayahs.length,
        revelationType: 'Mixed',
        ayahs: arabicData.data.ayahs,
      };

      const processedTranslation = {
        ...processedData,
        ayahs: translationData.data.ayahs,
      };

      setCurrentSurah(processedData);
      setTranslations(processedTranslation);
      setCurrentAyah(1);
    } catch (error) {
      console.error('Error fetching juz:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSearchSuggestions = (query: string) => {
    const suggestions: SearchSuggestion[] = [];

    const matchingSurahs = surahs
      .filter(
        (surah) =>
          surah.englishName.toLowerCase().includes(query.toLowerCase()) ||
          surah.englishNameTranslation
            .toLowerCase()
            .includes(query.toLowerCase())
      )
      .slice(0, 3);

    matchingSurahs.forEach((surah) => {
      suggestions.push({
        type: 'surah',
        title: surah.englishName,
        subtitle: `${surah.englishNameTranslation} • ${surah.numberOfAyahs} ayahs`,
        action: () => {
          fetchSurah(surah.number);
          setSearchQuery('');
          setShowSuggestions(false);
        },
      });
    });

    const juzNumber = Number.parseInt(query);
    if (!isNaN(juzNumber) && juzNumber >= 1 && juzNumber <= 30) {
      suggestions.push({
        type: 'juz',
        title: `Juz ${juzNumber}`,
        subtitle: `Para ${juzNumber}`,
        action: () => {
          fetchJuz(juzNumber);
          setSearchQuery('');
          setShowSuggestions(false);
        },
      });
    }

    if (
      query.toLowerCase().includes('page') ||
      (!isNaN(Number.parseInt(query)) && Number.parseInt(query) <= 604)
    ) {
      const pageNumber = query.toLowerCase().includes('page')
        ? Number.parseInt(query.replace(/\D/g, ''))
        : Number.parseInt(query);

      if (pageNumber >= 1 && pageNumber <= 604) {
        suggestions.push({
          type: 'page',
          title: `Page ${pageNumber}`,
          subtitle: `Halaman ${pageNumber}`,
          action: () => {
            const estimatedSurah = Math.ceil(pageNumber / 5);
            fetchSurah(Math.min(estimatedSurah, 114));
            setSearchQuery('');
            setShowSuggestions(false);
          },
        });
      }
    }

    setSearchSuggestions(suggestions);
    setShowSuggestions(suggestions.length > 0);
  };

  const fetchPrayerTimes = async (city: string = selectedCity) => {
    try {
      const response = await fetch(
        `https://api.aladhan.com/v1/timingsByCity?city=${city}&country=Indonesia&method=2`
      );
      const data = await response.json();
      if (data.code === 200) {
        setPrayerTimes(data.data.timings);
      }
    } catch (error) {
      console.error('Error fetching prayer times:', error);
    }
  };

  const playMainAudio = async () => {
    try {
      if (!currentSurah) return;
      setIsSurahLoading(true); // Mulai loading

      // STOPPED → PLAY dari awal
      if (isStopped) {
        // hentikan audio ayat jika ada
        if (isAyahPlaying) {
          ayahAudioRef.current?.pause();
          setIsAyahPlaying(false);
          setCurrentPlayingAyah(null);
        }
        const audioUrl = `https://cdn.islamic.network/quran/audio-surah/128/${audioEdition}/${currentSurah.number}.mp3`;
        if (audioRef.current) {
          const currentSrc = audioRef.current.getAttribute('src') || '';
          if (!currentSrc || currentSrc !== audioUrl)
            audioRef.current.src = audioUrl;
          audioRef.current.currentTime = 0;
          await audioRef.current.play();
          setIsMainPlaying(true);
          setIsStopped(false); // <<< seekbar muncul
        }
        setIsSurahLoading(false); // Hentikan loading

        return;
      }

      // SEDANG TIDAK STOP → klik tombol hijau = STOP TOTAL
      stopMainAudio();
    } catch (e) {
      console.error('Error playing main audio:', e);
      setErrorMsg('Tidak bisa memutar audio surat.');
      setIsSurahLoading(false); // Hentikan loading
    }
  };

  const stopMainAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      // opsional: lepaskan src agar benar-benar reset
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    setIsMainPlaying(false);
    setCurrentTime(0);
    setIsStopped(true); // <<< seekbar disembunyikan
    setIsSurahLoading(false); // Tambahkan baris ini untuk menghentikan loading
  };

  const togglePauseMainAudio = async () => {
    try {
      if (!audioRef.current) return;
      if (isMainPlaying) {
        audioRef.current.pause();
        setIsMainPlaying(false);
      } else {
        await audioRef.current.play();
        setIsMainPlaying(true);
      }
    } catch (e) {
      console.error('toggle pause:', e);
      setErrorMsg('Gagal pause/resume audio.');
    }
  };

  const playAyahAudio = async (ayahNumber: number) => {
    try {
      // Jika klik ayat yang sama:
      if (currentPlayingAyah === ayahNumber) {
        if (isAyahPlaying) {
          // Sedang play -> pause
          ayahAudioRef.current?.pause();
          setIsAyahPlaying(false);
          return;
        } else {
          // Sedang pause -> resume TANPA set src
          if (ayahAudioRef.current) {
            await ayahAudioRef.current.play();
            setIsAyahPlaying(true);
            return;
          }
        }
      }

      // Pause main audio jika sedang main
      if (isMainPlaying) {
        audioRef.current?.pause();
        setIsMainPlaying(false);
      }

      // Mainkan ayat yang baru
      const ayahGlobalNumber = currentSurah?.ayahs.find(
        (a) => a.numberInSurah === ayahNumber
      )?.number;
      if (!ayahGlobalNumber) return;

      const audioUrl = `https://cdn.islamic.network/quran/audio/128/${audioEdition}/${ayahGlobalNumber}.mp3`;

      setCurrentPlayingAyah(ayahNumber);
      setHighlightedAyah(ayahNumber);

      if (ayahRefs.current[ayahNumber]) {
        ayahRefs.current[ayahNumber]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }

      if (ayahAudioRef.current) {
        const currentSrc = ayahAudioRef.current.getAttribute('src') || '';
        if (!currentSrc || currentSrc !== audioUrl) {
          ayahAudioRef.current.src = audioUrl;
        }
        await ayahAudioRef.current.play();
        setIsAyahPlaying(true);
      }
    } catch (e) {
      console.error('Error playing ayah audio:', e);
      setErrorMsg('Tidak bisa memutar audio ayat.');
    }
  };

  const downloadAudio = async (ayahNumber: number) => {
    try {
      if (!currentSurah) return;
      const ayahGlobalNumber = currentSurah.ayahs.find(
        (a) => a.numberInSurah === ayahNumber
      )?.number;
      if (!ayahGlobalNumber) return;

      // endpoint per-ayat (128 kbps)
      const audioUrl = `https://cdn.islamic.network/quran/audio/128/${audioEdition}/${ayahGlobalNumber}.mp3`;

      const res = await fetch(audioUrl);
      if (!res.ok) throw new Error('Gagal mengambil audio');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentSurah.englishName}-Ayah-${ayahNumber}.mp3`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error downloading audio:', e);
    }
  };

  const toggleFavorite = (ayahNumber: number) => {
    if (currentSurah) {
      saveBookmark(currentSurah.number, ayahNumber);
    }
  };

  const fetchRandomAyah = async () => {
    try {
      setErrorMsg(null);
      const randomSurahNumber = Math.floor(Math.random() * 114) + 1;

      // Ambil edisi terjemahan dari state atau prop
      const translationEdition = selectedEdition;

      // URL API baru: tambahkan edisi terjemahan yang aktif
      const res = await fetch(
        `https://api.alquran.cloud/v1/surah/${randomSurahNumber}/editions/quran-uthmani,${translationEdition}`
      );
      const json = await res.json();
      if (json.code !== 200) throw new Error('API error');

      // Data sekarang adalah array dari edisi
      const arabAyahs = json.data[0].ayahs;
      const translationAyahs = json.data[1].ayahs;

      const idx = Math.floor(Math.random() * arabAyahs.length);

      const pickedArabAyah = arabAyahs[idx];
      const pickedTranslationAyah = translationAyahs[idx];

      setRandomAyah(pickedArabAyah);
      // Simpan terjemahan ke state baru, misalnya randomAyahTranslation
      setRandomAyahTranslation(pickedTranslationAyah.text);

      setRandomAyahSurahName(json.data[0].englishName);
    } catch (e) {
      console.error('random ayah:', e);
      setErrorMsg('Gagal memuat Ayat Hari Ini. Coba lagi.');
    }
  };
  const searchAyahs = () => {
    console.log('Searching for:', searchQuery);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleProgressChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    if (ayahAudioRef.current) {
      ayahAudioRef.current.volume = newVolume;
    }
  };

  const loadBookmark = () => {
    const savedBookmark = localStorage.getItem('quran-bookmark');
    if (savedBookmark) {
      setBookmark(JSON.parse(savedBookmark));
    }
  };

  const saveBookmark = (surahNumber: number, ayahNumber: number) => {
    const newBookmark = { surah: surahNumber, ayah: ayahNumber };
    setBookmark(newBookmark);
    localStorage.setItem('quran-bookmark', JSON.stringify(newBookmark));
  };

  const jumpToBookmark = () => {
    if (bookmark) {
      fetchSurah(bookmark.surah);
      setTimeout(() => {
        setHighlightedAyah(bookmark.ayah);
        if (ayahRefs.current[bookmark.ayah]) {
          ayahRefs.current[bookmark.ayah]?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }, 1000);
    }
  };

  const pauseMainAudio = () => {
    if (audioRef.current && isMainPlaying) {
      audioRef.current.pause();
      setIsMainPlaying(false);
    }
  };
  const handleAudioError = () => {
    setErrorMsg('Gagal memutar audio surat. Coba ganti qari atau cek koneksi.');
  };
  const handleAyahAudioError = () => {
    setErrorMsg('Gagal memutar audio ayat. Coba ganti qari atau cek koneksi.');
  };

  const toggleRepeatAyah = (ayahNumber: number) => {
    setRepeatAyah((prev) => {
      const next = { ...prev, [ayahNumber]: !prev[ayahNumber] };
      if (currentPlayingAyah === ayahNumber && ayahAudioRef.current) {
        ayahAudioRef.current.loop = !!next[ayahNumber];
      }
      return next;
    });
  };

  const downloadSurahAudio = async () => {
    try {
      if (!currentSurah) return;
      // endpoint per-surah (128 kbps)
      const audioUrl = `https://cdn.islamic.network/quran/audio-surah/128/${audioEdition}/${currentSurah.number}.mp3`;

      const res = await fetch(audioUrl);
      if (!res.ok) throw new Error('Gagal mengambil audio surah');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentSurah.englishName}-${audioEdition}.mp3`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error downloading surah audio:', e);
    }
  };

  const getActiveTranslationText = (ayahNumberInSurah: number) => {
    if (!translations) return '';
    return translations.ayahs.find((a) => a.numberInSurah === ayahNumberInSurah)
      ?.text;
  };
  const getLangLabel = () => {
    switch (selectedEdition) {
      case 'id.indonesian':
        return 'ID';
      case 'en.sahih':
        return 'EN';
      case 'ja.japanese':
        return 'JA';
      default:
        return 'ID';
    }
  };

  if (loading && !currentSurah) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading Quran...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background ${isDarkMode ? 'dark' : ''}`}>
      <audio
        ref={audioRef}
        onError={handleAudioError} // NEW
        loop={repeatSurah} // NEW: auto repeat jika aktif
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => {
          setDuration(audioRef.current?.duration || 0);
          setIsSurahLoading(false); // Hentikan loading setelah metadata dimuat
        }}
        onEnded={() => {
          // saat loop aktif, browser handle otomatis; kalau tidak, reset seperti biasa
          if (!repeatSurah) {
            setIsMainPlaying(false);
            setCurrentTime(0);
          }
        }}
      />

      <audio
        ref={ayahAudioRef}
        onError={handleAyahAudioError}
        onEnded={() => {
          setIsAyahPlaying(false);
          setCurrentPlayingAyah(null);
          setHighlightedAyah(null);
        }}
      />

      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        {errorMsg && (
          <div className="bg-destructive/10 text-destructive px-4 py-2 text-sm border-b">
            {errorMsg}
          </div>
        )}

        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden"
            >
              {mobileMenuOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </Button>

            <div className="flex items-center space-x-4 md:justify-start">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                <h1 className="text-lg md:text-xl font-bold text-primary">
                  Al-Quran Digital
                </h1>
              </div>
              {prayerTimes && (
                <div className="hidden md:block w-96 text-right">
                  <div className="text-sm text-muted-foreground overflow-hidden whitespace-nowrap">
                    <div className="animate-scroll">
                      {/* Menggabungkan konten asli dan duplikat ke dalam satu array sebelum digabungkan */}
                      {[
                        ...Object.entries(prayerTimes).slice(0, 7),
                        ...Object.entries(prayerTimes).slice(0, 7),
                      ]
                        .map(([prayer, time]) => {
                          const prayerNames = getPrayerNames(selectedEdition);
                          return `${
                            prayerNames[prayer as keyof typeof prayerNames] ||
                            prayer
                          }: ${time}`;
                        })
                        .join(' • ')}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <div className="hidden md:flex items-center space-x-2">
                {bookmark && (
                  <Button variant="ghost" size="sm" onClick={jumpToBookmark}>
                    <BookMarked className="h-4 w-4" />
                  </Button>
                )}

                <Select
                  value={selectedEdition}
                  onValueChange={setSelectedEdition}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="id.indonesian">Indonesia</SelectItem>
                    <SelectItem value="en.sahih">English</SelectItem>
                    {/* <SelectItem value="ja.japanese">日本語</SelectItem> */}
                  </SelectContent>
                </Select>

                <div className="flex items-center space-x-2 relative">
                  <Input
                    placeholder={
                      selectedEdition === 'id.indonesian'
                        ? 'Cari surat, juz, halaman...'
                        : 'Search surah, juz, pages...'
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchAyahs()}
                    onFocus={() =>
                      setShowSuggestions(searchSuggestions.length > 0)
                    }
                    className="w-64"
                  />
                  <Button onClick={searchAyahs} size="sm">
                    <Search className="h-4 w-4" />
                  </Button>

                  {showSuggestions && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-md shadow-lg z-50">
                      {searchSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            suggestion.action();
                            setMobileMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                        >
                          <div className="font-medium">{suggestion.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {suggestion.subtitle}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Select value={fontSize} onValueChange={setFontSize}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="14">
                      <span className="text-xs">
                        {selectedEdition === 'id.indonesian'
                          ? 'Kecil'
                          : 'Small'}
                      </span>
                    </SelectItem>
                    <SelectItem value="18">
                      <span className="text-xs">
                        {selectedEdition === 'id.indonesian'
                          ? 'Sedang'
                          : 'Medium'}
                      </span>
                    </SelectItem>
                    <SelectItem value="22">
                      <span className="text-xs">
                        {' '}
                        {selectedEdition === 'id.indonesian'
                          ? 'Besar'
                          : 'Large'}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex md:hidden items-center space-x-2">
                {bookmark && (
                  <Button variant="ghost" size="sm" onClick={jumpToBookmark}>
                    <BookMarked className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={toggleDarkMode}>
                  {isDarkMode ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleDarkMode}
                className="hidden md:flex"
              >
                {isDarkMode ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden mt-4 p-4 bg-card border rounded-lg space-y-4">
              {prayerTimes && (
                <div className="px-4 py-2 border-b">
                  <h3 className="text-sm font-medium mb-2">
                    {selectedEdition === 'id.indonesian'
                      ? 'Waktu Sholat'
                      : selectedEdition === 'ja.japanese'
                      ? '礼拝時間'
                      : 'Prayer Times'}{' '}
                    - {selectedCity}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(prayerTimes)
                      .slice(0, 7)
                      .map(([prayer, time]) => {
                        const prayerNames = getPrayerNames(selectedEdition);
                        return (
                          <div key={prayer} className="flex justify-between">
                            <span>
                              {prayerNames[
                                prayer as keyof typeof prayerNames
                              ] || prayer}
                              :
                            </span>
                            <span>{time as string}</span>
                          </div>
                        );
                      })}
                  </div>
                  <Select
                    value={selectedCity}
                    onValueChange={(value) => setSelectedCity(value)}
                  >
                    <SelectTrigger className="w-full mt-2 h-8 text-xs">
                      <SelectValue placeholder="Pilih Kota" />
                    </SelectTrigger>

                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Translation
                  </label>
                  <Select
                    value={selectedEdition}
                    onValueChange={setSelectedEdition}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="id.indonesian">Indonesia</SelectItem>
                      <SelectItem value="en.sahih">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Font Size
                  </label>
                  <Select value={fontSize} onValueChange={setFontSize}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="14">
                        <span className="text-xs">
                          {selectedEdition === 'id.indonesian'
                            ? 'Kecil'
                            : 'Small'}
                        </span>
                      </SelectItem>
                      <SelectItem value="18">
                        <span className="text-xs">
                          {selectedEdition === 'id.indonesian'
                            ? 'Sedang'
                            : 'Medium'}
                        </span>
                      </SelectItem>
                      <SelectItem value="22">
                        <span className="text-xs">
                          {selectedEdition === 'id.indonesian'
                            ? 'Besar'
                            : 'Large'}
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Search
                  </label>
                  <div className="flex items-center space-x-2 relative">
                    <Input
                      placeholder="Search surahs, juz, pages..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && searchAyahs()}
                      onFocus={() =>
                        setShowSuggestions(searchSuggestions.length > 0)
                      }
                      className="flex-1"
                    />
                    <Button onClick={searchAyahs} size="sm">
                      <Search className="h-4 w-4" />
                    </Button>

                    {showSuggestions && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-md shadow-lg z-50">
                        {searchSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              suggestion.action();
                              setMobileMenuOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                          >
                            <div className="font-medium">
                              {suggestion.title}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {suggestion.subtitle}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0 fixed md:static inset-y-0 left-0 z-40 w-72 md:w-80 bg-sidebar border-r transition-transform duration-300 ease-in-out overflow-hidden`}
        >
          <div className="h-full overflow-y-auto">
            <div className="p-4 space-y-4">
              <Card className="islamic-pattern mt-2 md:mt-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Stars className="h-4 w-4 text-accent" />
                    {selectedEdition === 'id.indonesian'
                      ? 'Ayat Hari Ini'
                      : selectedEdition === 'ja.japanese'
                      ? '今日の節'
                      : 'Ayah of the Day'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {randomAyah && (
                    <>
                      <p
                        className={`arabic-text ${fontSize} text-primary leading-relaxed`}
                      >
                        {randomAyah.text}
                      </p>
                      {/* Menampilkan terjemahan */}
                      <p className="text-sm text-primary/70">
                        {randomAyahTranslation}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {(randomAyahSurahName || currentSurah?.englishName) ??
                          '—'}{' '}
                        : {randomAyah.numberInSurah}
                      </p>
                    </>
                  )}
                  {/* <Button
                    onClick={fetchRandomAyah}
                    size="sm"
                    variant="outline"
                    className="w-full bg-transparent"
                  >
                    {selectedEdition === 'id.indonesian'
                      ? 'Ayat Baru'
                      : selectedEdition === 'ja.japanese'
                      ? '新しい節'
                      : 'New Ayah'}
                  </Button> */}
                </CardContent>
              </Card>

              <div className="flex space-x-2">
                <Button
                  variant={navigationMode === 'surah' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNavigationMode('surah')}
                  className="flex-1"
                >
                  {selectedEdition === 'id.indonesian' ? 'Surat' : 'Surahs'}
                </Button>
                <Button
                  variant={navigationMode === 'juz' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNavigationMode('juz')}
                  className="flex-1"
                >
                  {selectedEdition === 'id.indonesian' ? 'Juz' : 'Juz'}
                </Button>
              </div>

              <Card className="flex-1">
                <CardHeader className="">
                  <CardTitle className="text-base">
                    {navigationMode === 'surah'
                      ? selectedEdition === 'id.indonesian'
                        ? 'Daftar Surat'
                        : 'List of Surahs'
                      : selectedEdition === 'id.indonesian'
                      ? 'Daftar Juz'
                      : 'List of Juz'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-96">
                    <div className="space-y-1 p-4">
                      {navigationMode === 'surah'
                        ? surahs.map((surah) => (
                            <button
                              key={surah.number}
                              onClick={() => fetchSurah(surah.number)}
                              className={`w-full text-left p-2 rounded-md hover:bg-muted transition-colors  ${
                                currentSurah?.number === surah.number
                                  ? 'bg-primary text-primary-foreground'
                                  : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-sm">
                                    {selectedEdition === 'id.indonesian'
                                      ? surahNamesIndonesian[surah.number] ||
                                        surah.englishName
                                      : surah.englishName}
                                  </div>
                                  <div
                                    className={`text-xs  ${
                                      currentSurah?.number === surah.number
                                        ? 'text-white'
                                        : 'text-muted-foreground'
                                    }`}
                                  >
                                    {selectedEdition === 'id.indonesian'
                                      ? surahMeansIndonesian[surah.number] ||
                                        surah.englishNameTranslation
                                      : surah.englishNameTranslation}
                                  </div>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {surah.number}
                                </Badge>
                              </div>
                            </button>
                          ))
                        : juzList.map((juz) => (
                            <button
                              key={juz.number}
                              onClick={() => fetchJuz(juz.number)}
                              className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-sm">
                                    {juz.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {juz.arabicName}
                                  </div>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {juz.number}
                                </Badge>
                              </div>
                            </button>
                          ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="md:hidden p-4 border-b bg-background/95 backdrop-blur sticky top-0 z-10">
            <Button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
            >
              <BookOpen className="h-4 w-4" />
              {sidebarOpen
                ? selectedEdition === 'id.indonesian'
                  ? 'Sembunyikan Daftar Surat'
                  : selectedEdition === 'ja.japanese'
                  ? 'スーラリストを隠す'
                  : 'Hide Surah List'
                : selectedEdition === 'id.indonesian'
                ? 'Tampilkan Daftar Surat'
                : selectedEdition === 'ja.japanese'
                ? 'スーラリストを表示'
                : 'Show Surah List'}
            </Button>
          </div>

          <div className="p-2 md:p-4 lg:p-6">
            {currentSurah && (
              <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
                <Card className="islamic-pattern">
                  <CardHeader className="text-center p-4 md:p-6">
                    <div className="space-y-2">
                      <Badge variant="secondary" className="text-xs">
                        {navigationMode === 'surah'
                          ? selectedEdition === 'id.indonesian'
                            ? 'Surat'
                            : 'Surahs'
                          : selectedEdition === 'id.indonesian'
                          ? 'Juz'
                          : 'Juz'}
                      </Badge>
                      <CardTitle className="text-xl md:text-2xl text-primary">
                        {selectedEdition === 'id.indonesian'
                          ? surahNamesIndonesian[currentSurah.number] ||
                            currentSurah.englishName
                          : currentSurah.englishName}
                      </CardTitle>
                      <p className="text-sm md:text-base font-bold">
                        {selectedEdition === 'id.indonesian'
                          ? surahMeansIndonesian[currentSurah.number] ||
                            currentSurah.englishNameTranslation
                          : currentSurah.englishNameTranslation}{' '}
                      </p>{' '}
                      <p className="text-xs md:text-sm text-muted-foreground">
                        {currentSurah.numberOfAyahs}{' '}
                        {selectedEdition === 'id.indonesian' ? 'Ayat' : 'Ayahs'}{' '}
                        •{' '}
                        {currentSurah.revelationType === 'Meccan'
                          ? selectedEdition === 'id.indonesian'
                            ? 'Mekah'
                            : 'Meccan'
                          : selectedEdition === 'id.indonesian'
                          ? 'Madinah'
                          : 'Medinan'}
                      </p>
                    </div>
                  </CardHeader>
                </Card>

                <Card>
                  <CardContent className="p-3 md:p-4">
                    <div className="space-y-4">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0">
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={playMainAudio}
                            size="sm"
                            className="flex items-center gap-2"
                            disabled={isSurahLoading} // Tombol dinonaktifkan saat loading
                          >
                            {isSurahLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : isStopped ? (
                              <Play className="h-4 w-4" />
                            ) : (
                              <StopCircle className="h-4 w-4" />
                            )}
                            <span className="hidden md:inline">
                              {isSurahLoading
                                ? 'Memuat...'
                                : isStopped
                                ? selectedEdition === 'id.indonesian'
                                  ? 'Putar Surat'
                                  : 'Play Surah'
                                : selectedEdition === 'id.indonesian'
                                ? 'Stop Surat'
                                : 'Stop Surah'}
                            </span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowTranslation(!showTranslation)}
                            className="ml-2"
                          >
                            {showTranslation
                              ? selectedEdition === 'id.indonesian'
                                ? 'Sembunyikan Terjemahan'
                                : 'Hide Translation'
                              : selectedEdition === 'id.indonesian'
                              ? 'Tampilkan Terjemahan'
                              : 'Show Translation'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={downloadSurahAudio}
                            className="ml-2"
                            title="Download MP3 Surah"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            <span className="hidden md:inline">
                              {selectedEdition === 'id.indonesian'
                                ? 'Unduh Mp3 Surat'
                                : 'Download Mp3 Surah'}
                            </span>
                          </Button>
                        </div>

                        <Select
                          value={audioEdition}
                          onValueChange={setAudioEditionState}
                        >
                          <SelectTrigger className="w-full md:w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {audioReciters.map((reciter) => (
                              <SelectItem
                                key={reciter.identifier}
                                value={reciter.identifier}
                              >
                                {reciter.englishName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {!isStopped && (
                        <div className="bg-muted/50 rounded-lg p-3 md:p-4 space-y-3">
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                          </div>

                          <Slider
                            value={[currentTime]}
                            max={duration}
                            step={1}
                            onValueChange={handleProgressChange}
                            className="w-full"
                          />

                          <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0">
                            <div className="flex items-center space-x-2">
                              {/* PAUSE/RESUME di sini */}
                              <Button
                                onClick={togglePauseMainAudio}
                                size="sm"
                                variant="ghost"
                              >
                                {isMainPlaying ? (
                                  <Pause className="h-4 w-4" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </Button>
                              <span className="text-sm text-muted-foreground">
                                {formatTime(currentTime)} /{' '}
                                {formatTime(duration)}
                              </span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <Volume2 className="h-4 w-4 text-muted-foreground" />
                              <Slider
                                value={[volume]}
                                max={1}
                                step={0.1}
                                onValueChange={handleVolumeChange}
                                className="w-16 md:w-20"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setRepeatSurah((v) => !v)}
                                className={repeatSurah ? 'text-primary' : ''}
                                title={
                                  repeatSurah
                                    ? 'Repeat Surah: ON'
                                    : 'Repeat Surah: OFF'
                                }
                              >
                                <Repeat className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-3 md:space-y-4">
                  {currentSurah.ayahs.map((ayah) => (
                    <Card
                      key={ayah.number}
                      className={`group hover:shadow-md transition-shadow ${
                        highlightedAyah === ayah.numberInSurah
                          ? 'ring-2 ring-primary'
                          : ''
                      } ${
                        bookmark?.surah === currentSurah.number &&
                        bookmark?.ayah === ayah.numberInSurah
                          ? 'bg-primary/5'
                          : ''
                      }`}
                      ref={(el) => {
                        ayahRefs.current[ayah.numberInSurah] = el;
                      }}
                    >
                      <CardContent className="p-4 md:p-6">
                        <div className="flex items-start justify-between mb-4">
                          <Badge variant="outline" className="verse-separator">
                            {ayah.numberInSurah}
                          </Badge>
                          <div className="flex items-center space-x-1 md:space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                toggleRepeatAyah(ayah.numberInSurah)
                              }
                              className={
                                repeatAyah[ayah.numberInSurah]
                                  ? 'text-primary'
                                  : ''
                              }
                              title={
                                repeatAyah[ayah.numberInSurah]
                                  ? 'Repeat Ayat: ON'
                                  : 'Repeat Ayat: OFF'
                              }
                            >
                              <Repeat1 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => playAyahAudio(ayah.numberInSurah)}
                              className={
                                currentPlayingAyah === ayah.numberInSurah &&
                                isAyahPlaying
                                  ? 'text-primary'
                                  : ''
                              }
                            >
                              {currentPlayingAyah === ayah.numberInSurah &&
                              isAyahPlaying ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => downloadAudio(ayah.numberInSurah)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleFavorite(ayah.numberInSurah)}
                            >
                              <BookMarked
                                className={`h-4 w-4 ${
                                  bookmark?.surah === currentSurah.number &&
                                  bookmark?.ayah === ayah.numberInSurah
                                    ? 'outline-yellow-500 text-yellow-500'
                                    : ''
                                }`}
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedAyah({
                                  text: ayah.text,
                                  translation: getActiveTranslationText(
                                    ayah.numberInSurah
                                  ),
                                  surah: currentSurah.englishName,
                                  ayah: ayah.numberInSurah,
                                });
                                setShareOpen(true);
                              }}
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>

                            {/* Modal */}
                            {selectedAyah && (
                              <ShareAyahModal
                                open={shareOpen}
                                onClose={() => setShareOpen(false)}
                                ayahText={selectedAyah.text}
                                translation={selectedAyah.translation}
                                surahName={selectedAyah.surah}
                                ayahNumber={selectedAyah.ayah}
                                langLabel={
                                  editions.find(
                                    (e) => e.identifier === selectedEdition
                                  )?.language === 'id'
                                    ? 'ID'
                                    : 'EN'
                                }
                              />
                            )}
                          </div>
                        </div>

                        <div className="space-y-3 md:space-y-4">
                          <p
                            className="arabic-text leading-loose text-primary text-right"
                            style={{ fontSize: `${Number(fontSize) + 5}px` }}
                          >
                            {ayah.text}
                          </p>

                          {showTranslation && translations && (
                            <p
                              className="text-muted-foreground leading-relaxed"
                              style={{ fontSize: `${Number(fontSize) - 2}px` }}
                            >
                              {translations.ayahs[ayah.numberInSurah - 1]?.text}
                            </p>
                          )}

                          <div className="flex flex-col md:flex-row items-start md:items-center justify-between text-xs text-muted-foreground pt-2 border-t space-y-1 md:space-y-0">
                            <span>
                              Juz {ayah.juz} • Page {ayah.page}
                            </span>
                            {ayah.sajda && (
                              <Badge variant="secondary" className="text-xs">
                                Sajda
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
                  <Button
                    variant="outline"
                    onClick={() =>
                      currentSurah.number > 1 &&
                      fetchSurah(currentSurah.number - 1)
                    }
                    disabled={currentSurah.number === 1}
                    className="flex items-center gap-2 w-full md:w-auto"
                  >
                    <SkipBack className="h-4 w-4" />
                    <span className="hidden md:inline">
                      {selectedEdition === 'id.indonesian'
                        ? 'Surat Sebelumnya'
                        : 'Previous Surah'}
                    </span>
                    <span className="md:hidden">
                      {selectedEdition === 'id.indonesian'
                        ? 'Sebelumnya'
                        : 'Previous'}
                    </span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() =>
                      currentSurah.number < 114 &&
                      fetchSurah(currentSurah.number + 1)
                    }
                    disabled={currentSurah.number === 114}
                    className="flex items-center gap-2 w-full md:w-auto"
                  >
                    <span className="hidden md:inline">
                      {selectedEdition === 'id.indonesian'
                        ? 'Surat Berikutnya'
                        : 'Next Surah'}
                    </span>
                    <span className="md:hidden">
                      {selectedEdition === 'id.indonesian'
                        ? 'Berikutnya'
                        : 'Next'}
                    </span>
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>

                <div className="text-center py-8 border-t">
                  <p className="text-sm text-muted-foreground">
                    Al-Quran Digital • Powered by{' '}
                    <a
                      href="https://alquran.cloud"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      AlQuran.cloud API
                    </a>
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {(sidebarOpen || mobileMenuOpen) && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => {
            setSidebarOpen(false);
            setMobileMenuOpen(false);
          }}
        />
      )}
    </div>
  );
}
