'use client';

import React, { useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Share2,
  Download,
  Copy,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CardFooter } from './ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider } from './ui/slider';

const isShareSupported = () => {
  return typeof navigator !== 'undefined' && navigator.share;
};

interface ShareAyahModalProps {
  open: boolean;
  onClose: () => void;
  ayahText: string;
  translation: string;
  surahName: string;
  ayahNumber: number;
  langLabel?: string;
  fetchSurah?: (surah: string) => void;
  setHighlightedAyah?: (ayah: number) => void;
  ayahRefs?: React.MutableRefObject<Record<number, HTMLElement | null>>;
}

export default function ShareAyahModal({
  open,
  onClose,
  ayahText,
  translation,
  surahName,
  ayahNumber,
  langLabel = 'ID',
  fetchSurah,
  setHighlightedAyah,
  ayahRefs,
}: ShareAyahModalProps) {
  const [bgIndex, setBgIndex] = useState<number>(1);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [textSize, setTextSize] = useState(18); // default 18px

  const totalBg = 15;
  const itemsPerSlide = 5;
  const totalSlides = Math.ceil(totalBg / itemsPerSlide);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  const bgUrlLocal = (i: number) => `/share/${i}.jpg`;
  const sharePreviewRef = useRef<HTMLDivElement>(null);

  const getSlideItems = (slide: number) => {
    const start = slide * itemsPerSlide;
    const items: (number | null)[] = [];

    for (let idx = 0; idx < itemsPerSlide; idx++) {
      const i = start + idx + 1;
      if (i <= totalBg) {
        items.push(i);
      } else {
        items.push(null); // filler agar tetap 5 slot
      }
    }
    return items;
  };

  const goNext = () => {
    setDirection('next');
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const goPrev = () => {
    setDirection('prev');
    setCurrentSlide((prev) => (prev - 1 < 0 ? totalSlides - 1 : prev - 1));
  };

  const jumpToAyah = () => {
    if (fetchSurah && setHighlightedAyah && ayahRefs) {
      fetchSurah(surahName);
      setTimeout(() => {
        setHighlightedAyah(ayahNumber);
        if (ayahRefs.current[ayahNumber]) {
          ayahRefs.current[ayahNumber]?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }, 800);
      onClose();
    } else {
      setMessage('Navigasi ke ayat tidak didukung di halaman ini.');
    }
  };

  const generateImage = async () => {
    try {
      setMessage(null);
      setGenerating(true);

      const node = sharePreviewRef.current;
      if (!node) {
        setMessage('Preview element not found.');
        setGenerating(false);
        return null;
      }

      const dataUrl = await toPng(node, {
        backgroundColor: undefined,
        quality: 1,
      });

      return dataUrl;
    } catch (err) {
      console.error('generateImage:', err);
      setMessage('Failed to create image. ');
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const downloadImage = async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) return;

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `ayat-${surahName}-${ayahNumber}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const shareWhatsApp = () => {
    const text = `
*${ayahText}*
    
${translation}
    
(${surahName}:${ayahNumber})
    
Bagikan dari aplikasi Al-Quran
`;
    if (isShareSupported()) {
      navigator
        .share({
          title: `Ayat ${surahName}:${ayahNumber}`,
          text: text,
        })
        .catch((err) => console.log('Share error:', err));
    } else {
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    }
  };

  const shareWeb = async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) {
      setMessage('Gagal membuat gambar untuk dibagikan.');
      return;
    }

    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `ayat-${surahName}-${ayahNumber}.png`, {
        type: blob.type,
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Ayat ${surahName}:${ayahNumber}`,
          text: translation,
          files: [file],
        });
      } else {
        setMessage('Web Share API tidak mendukung. Gambar diunduh.');
        downloadImage();
      }
    } catch (err) {
      console.error('shareWeb:', err);
      setMessage('Gagal membagikan. ');
    }
  };

  const copyAsText = async () => {
    try {
      const payload = `${ayahText}\n\n${translation}\n\n(${surahName}:${ayahNumber})`;
      await navigator.clipboard.writeText(payload);
      setMessage('Teks disalin ke clipboard.');
      setTimeout(() => setMessage(null), 2000);
    } catch (e) {
      console.error('copyAsText:', e);
      setMessage('Gagal menyalin teks.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md md:max-w-lg lg:max-w-xl p-4">
        <DialogHeader>
          <DialogTitle className="text-center">Bagikan Ayat</DialogTitle>
        </DialogHeader>

        {/* Preview Ayat */}
        <div className="flex justify-center mb-4">
          <div
            id="share-preview"
            ref={sharePreviewRef}
            className="relative w-64 md:w-72 aspect-square rounded-xl overflow-hidden flex flex-col items-center justify-center text-center p-4"
            style={{
              backgroundImage: `url(${bgUrlLocal(bgIndex)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div className="absolute inset-0 bg-black/60" />
            <div className="relative z-10 text-center">
              <p
                className="text-white font-semibold leading-relaxed"
                style={{ fontSize: `${textSize + 2}px` }}
              >
                {ayahText}
              </p>
              <p
                className="mt-2 text-white font-light"
                style={{ fontSize: `${textSize - 4}px` }}
              >
                {translation}
              </p>
              <p
                className="mt-2 text-xs md:text-sm text-white/80"
                style={{ fontSize: `${textSize - 4}px` }}
              >
                ({surahName}:{ayahNumber})
              </p>
            </div>
          </div>
        </div>

        <div className="my-4 flex items-center justify-center gap-3">
          <span className="text-sm whitespace-nowrap">Teks Size:</span>
          <div className="w-full max-w-[200px]">
            <Slider
              defaultValue={[18]}
              min={12}
              max={32}
              step={1}
              onValueChange={(val) => setTextSize(val[0])}
            />
          </div>
        </div>

        <CardFooter className="p-4">
          <div className="grid grid-cols-2 gap-3 w-full">
            <Button
              size="sm"
              onClick={downloadImage}
              disabled={generating}
              className="w-full flex items-center justify-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>

            <Button
              size="sm"
              onClick={shareWhatsApp}
              className="w-full flex items-center justify-center bg-green-600 hover:bg-green-700"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>

            <Button
              size="sm"
              onClick={shareWeb}
              disabled={generating}
              className="w-full flex items-center justify-center"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share Web
            </Button>

            <Button
              size="sm"
              onClick={copyAsText}
              variant="secondary"
              className="w-full flex items-center justify-center"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Text
            </Button>
          </div>
        </CardFooter>

        {/* Carousel Thumbnail */}
        <div className="relative flex items-center mb-4">
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full absolute left-0 z-10 bg-white/80"
            onClick={goPrev}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex-1 md:mx-12 overflow-hidden p-2">
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: direction === 'next' ? 100 : -100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction === 'next' ? -100 : 100 }}
                transition={{ duration: 0.1 }}
                className="flex flex-nowrap gap-2 items-center"
              >
                {getSlideItems(currentSlide).map((i, idx) =>
                  i ? (
                    <Image
                      key={i}
                      src={bgUrlLocal(Number(i))}
                      alt={`bg ${i}`}
                      width={80}
                      height={80}
                      className={cn(
                        'w-20 h-20 rounded-lg object-cover cursor-pointer transition-all',
                        bgIndex === Number(i)
                          ? 'ring-2 ring-primary ring-offset-2'
                          : ''
                      )}
                      onClick={() => setBgIndex(Number(i))}
                    />
                  ) : (
                    <div
                      key={`empty-${idx}`}
                      className="w-20 h-20 rounded-lg invisible"
                    />
                  )
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <Button
            size="icon"
            variant="ghost"
            className="rounded-full absolute right-0 z-10 bg-white/80"
            onClick={goNext}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Message */}
        {message && (
          <div className="mt-2 text-sm text-center text-muted-foreground">
            {message}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
