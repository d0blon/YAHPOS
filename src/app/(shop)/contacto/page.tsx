"use client";

import { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send, MessageCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate form submission
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    }, 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">
      {/* Hero */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Contáctanos
          </h1>
          <p className="text-xl text-red-100 max-w-2xl mx-auto">
            Estamos aquí para ayudarte. Escríbenos y te responderemos a la brevedad.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg dark:text-white">Dirección</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Av. Los Pinos 1234<br />
                      Santiago, Chile
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg dark:text-white">Teléfono</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      +56 2 2345 6789<br />
                      +56 9 1234 5678
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg dark:text-white">Correo</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      contacto@supermercadosf.cl<br />
                      ventas@supermercadosf.cl
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg dark:text-white">Horario</h3>
                    <div className="text-gray-600 dark:text-gray-400">
                      <p>Lunes a Viernes: 8:00 - 21:00</p>
                      <p>Sábado: 8:00 - 22:00</p>
                      <p>Domingo: 9:00 - 20:00</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* WhatsApp CTA */}
            <a 
              href="https://wa.me/56912345678" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Card className="bg-green-600 text-white hover:bg-green-700 transition-colors cursor-pointer">
                <CardContent className="p-6 flex items-center gap-4">
                  <MessageCircle className="h-8 w-8" />
                  <div>
                    <h3 className="font-semibold text-lg">Escríbenos por WhatsApp</h3>
                    <p className="text-green-100">Respuesta inmediata</p>
                  </div>
                </CardContent>
              </Card>
            </a>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Envíanos un Mensaje</CardTitle>
              </CardHeader>
              <CardContent>
                {isSubmitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      ¡Mensaje enviado!
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Te responderemos a la brevedad.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nombre Completo *</Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Juan Pérez"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Correo Electrónico *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="tu@email.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="+56 9 1234 5678"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">Asunto *</Label>
                        <Input
                          id="subject"
                          name="subject"
                          value={formData.subject}
                          onChange={handleChange}
                          placeholder="Consulta sobre producto"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Mensaje *</Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Escribe tu mensaje aquí..."
                        rows={6}
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full bg-red-600 hover:bg-red-700">
                      <Send className="h-4 w-4 mr-2" />
                      Enviar Mensaje
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Map */}
            <Card className="mt-6">
              <CardContent className="p-0">
                <div className="aspect-video bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Mapa de ubicación</p>
                    <p className="text-sm text-gray-400">Av. Los Pinos 1234, Santiago</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
