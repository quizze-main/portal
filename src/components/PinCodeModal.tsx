import { useState, useEffect, KeyboardEvent } from 'react';
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface PinCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPinSuccess: (pin: string) => Promise<boolean>;
}

export const PinCodeModal = ({ isOpen, onClose, onPinSuccess }: PinCodeModalProps) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  // Новый эффект: автоподтверждение, когда введены все 4 цифры
  useEffect(() => {
    if (pin.length === 4) {
      // Попытка автоматической отправки пин-кода
      handlePinSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const handlePinSubmit = async () => {
    const ok = await onPinSuccess(pin);
    if (!ok) {
      setError('Неверный пин-код');
      setPin('');
      // После очистки фокусируемся вновь на первом слоте
      setTimeout(() => {
        const el = document.querySelector('[data-input-otp]') as HTMLInputElement | null;
        el?.focus();
      }, 0);
    }
  };
  
  // Автофокус при открытии модали
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const el = document.querySelector('[data-input-otp]') as HTMLInputElement | null;
        el?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (pin.length >= 4) {
        handlePinSubmit();
      }
    }
  };

  const handlePinChange = (value: string) => {
    setError('');
    setPin(value);
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="w-full max-w-sm min-h-[236px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 p-6 text-center w-full">
        <h3 className="text-2xl font-semibold leading-none tracking-tight">Демо-режим</h3>
        <p className="text-sm text-muted-foreground mb-2">Введите пин-код для входа.</p>
        <InputOTP maxLength={4} value={pin} onChange={handlePinChange} onKeyDown={handleKeyDown}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
          </InputOTPGroup>
        </InputOTP>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button onClick={handlePinSubmit} className="w-full mt-2" disabled={pin.length < 4}>
          Войти
        </Button>
      </div>
    </div>
  );
}; 