"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, Mail, Lock, User, Phone, MapPin, ArrowRight, Check, Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores';
import { formatRut, validateRut } from '@/lib/utils';

export default function Register() {
  const navigate = useRouter();
  const { register } = useAuthStore();
  
  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    email: '',
    phone: '',
    rut: '',
    address: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptMarketing, setAcceptMarketing] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (!validateRut(formData.rut)) {
      setError('El RUT ingresado no es válido');
      return;
    }

    if (!acceptTerms) {
      setError('Debes aceptar los términos y condiciones');
      return;
    }

    setIsLoading(true);

    let formattedPhone = formData.phone;
    if (formattedPhone) {
      // Limpiamos espacios y evitamos duplicar el +56 si el usuario lo tipeó
      let cleaned = formattedPhone.replace(/\s+/g, '');
      if (cleaned.startsWith('+56')) cleaned = cleaned.slice(3);
      else if (cleaned.startsWith('56') && cleaned.length > 9) cleaned = cleaned.slice(2); // asumiendo largo de chile
      formattedPhone = `+56${cleaned}`;
    }

    try {
      await register({
        firstName: formData.name,
        lastName: formData.lastName,
        email: formData.email,
        phone: formattedPhone,
        rut: formData.rut,
        password: formData.password,
        acceptMarketing
      });

      navigate.push('/');
    } catch {
      setError('Error al crear la cuenta');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 w-full">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-48 h-16 bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl flex items-center justify-center p-4 shadow-2xl border border-white/20 dark:border-white/10 mx-auto">
              <Image 
                src="/logos/yahpos_logo_master_512.png" 
                alt="YAHPOS!" 
                width={160} 
                height={40} 
                className="w-full h-full object-contain"
              />
            </div>
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
            Crea tu cuenta
          </h1>
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            Únete a YAHPOS! y potencia tu experiencia
          </p>
        </div>

        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-gray-800/50 shadow-2xl shadow-brand-accent-100/50 dark:shadow-black/40">
          <CardHeader>
            <CardTitle>Registro</CardTitle>
            <CardDescription>
              Completa tus datos para crear una cuenta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                    <Input
                      id="name"
                      name="name"
                      placeholder="Juan"
                      value={formData.name}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellido</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                    <Input
                      id="lastName"
                      name="lastName"
                      placeholder="Pérez"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rut">RUT</Label>
                  <div className="relative">
                  <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                  <Input
                    id="rut"
                    name="rut"
                    placeholder="12.345.678-9"
                    value={formData.rut}
                    onChange={(e) => setFormData({ ...formData, rut: formatRut(e.target.value) })}
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-[10px] text-gray-400 pl-1">Vinculará tus puntos acumulados en caja automáticamente.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                  <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                  <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                  <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium z-10 pointer-events-none">+56</span>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="9 1234 5678"
                    value={formData.phone}
                    onChange={handleChange}
                    className="pl-[4.5rem]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                  <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
                  <Input
                    id="address"
                    name="address"
                    placeholder="Av. Principal 123"
                    value={formData.address}
                    onChange={handleChange}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked: boolean) => setAcceptTerms(checked)}
                  className="mt-1"
                />
                <Label htmlFor="terms" className="text-sm font-normal leading-tight">
                  Acepto los{' '}
                  <Link href="/terminos" className="text-red-600 hover:underline">
                    términos y condiciones
                  </Link>{' '}
                  y la{' '}
                  <Link href="/privacidad" className="text-red-600 hover:underline">
                    política de privacidad
                  </Link>
                </Label>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="marketing"
                  checked={acceptMarketing}
                  onCheckedChange={(checked: boolean) => setAcceptMarketing(checked)}
                  className="mt-1"
                />
                <Label htmlFor="marketing" className="text-sm font-normal leading-tight text-gray-600 dark:text-gray-400 cursor-pointer">
                  Acepto recibir correos, SMS y mensajes por WhatsApp con ofertas y promociones exclusivas.
                </Label>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creando cuenta...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Crear Cuenta
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ¿Ya tienes una cuenta?{' '}
                <Link href="/login" className="text-red-600 hover:underline font-medium">
                  Inicia sesión
                </Link>
              </p>
            </div>

            {/* Benefits */}
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                Beneficios de registrarte:
              </p>
              <ul className="text-xs text-green-700 dark:text-green-300 space-y-1">
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3" />
                  50 puntos de bienvenida
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3" />
                  Acumula puntos con cada compra
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3" />
                  Guarda tu carrito y listas de deseos
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3 w-3" />
                  Acceso a ofertas exclusivas
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

