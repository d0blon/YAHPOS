import Link from 'next/link';
import Image from 'next/image';
import { Award, Users, Heart, TrendingUp, MapPin, Phone, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function About() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">
      {/* Hero */}
      <div className="relative bg-gray-900 text-white py-24">
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1200&auto=format&fit=crop)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tighter italic">
            YAHPOS!<span className="text-brand-accent-700">!</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto font-medium">
            Tu ecosistema de comercio inteligente desde el corazón del sur
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        {/* Our Story */}
        <section className="mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-6 uppercase tracking-tighter">
                Nuestra Historia en <span className="text-brand-primary italic">YAHPOS!</span>
              </h2>
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  YAHPOS! nació como una respuesta a las necesidades del comercio local en Castro, Chiloé,
                  con raíces profundas en el sur de Chile. Con el paso de los años, hemos
                  evolucionado hacia una plataforma tecnológica integral para el comercio moderno.
                </p>
                <p>
                  Nuestra filosofía siempre ha sido la misma: ofrecer productos de la más alta
                  calidad a precios justos, con un servicio personalizado que nos distingue de
                  las grandes cadenas. Este sistema fue desarrollado con pasión desde el sur del mundo
                  para llevar la eficiencia patagónica al comercio moderno.
                </p>
                <p>
                  Hoy contamos con un equipo comprometido con brindar la mejor experiencia de compra,
                  manteniendo siempre los valores de cercanía y confianza que nos caracterizan,
                  inspirados en la belleza y autenticidad de nuestra región.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Image
                src="https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&auto=format&fit=crop"
                alt="Nuestra tienda"
                width={400}
                height={192}
                unoptimized
                className="rounded-3xl w-full h-48 object-cover shadow-2xl"
              />
              <Image
                src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop"
                alt="Productos frescos"
                width={400}
                height={192}
                unoptimized
                className="rounded-3xl w-full h-48 object-cover mt-8 shadow-2xl"
              />
              <Image
                src="https://images.unsplash.com/photo-1607623814075-e51df1bd6565?w=400&auto=format&fit=crop"
                alt="Carnicería"
                width={400}
                height={192}
                unoptimized
                className="rounded-3xl w-full h-48 object-cover shadow-2xl"
              />
              <Image
                src="https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400&auto=format&fit=crop"
                alt="Atención al cliente"
                width={400}
                height={192}
                unoptimized
                className="rounded-3xl w-full h-48 object-cover mt-8 shadow-2xl"
              />
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="mb-16">
          <h2 className="text-3xl font-black text-gray-900 dark:text-white text-center mb-12 uppercase tracking-tighter">
            Nuestros Valores
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Heart,
                title: 'Pasión',
                description: 'Amamos lo que hacemos y eso se refleja en cada detalle.',
              },
              {
                icon: Award,
                title: 'Calidad',
                description: 'Seleccionamos rigurosamente cada producto que ofrecemos.',
              },
              {
                icon: Users,
                title: 'Cercanía',
                description: 'Tratamos a cada cliente como parte de nuestra familia.',
              },
              {
                icon: TrendingUp,
                title: 'Excelencia',
                description: 'Siempre buscamos formas de servirte mediante la innovación.',
              },
            ].map((value) => (
              <Card key={value.title} className="text-center rounded-3xl border-none shadow-xl bg-white dark:bg-gray-800">
                <CardContent className="p-6">
                  <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <value.icon className="h-8 w-8 text-brand-primary" />
                  </div>
                  <h3 className="text-xl font-black mb-2 dark:text-white uppercase tracking-tighter">{value.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-brand-primary to-brand-700 rounded-[3rem] p-8 md:p-12 shadow-2xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
              <div>
                <p className="text-4xl md:text-5xl font-black tracking-tighter">29+</p>
                <p className="text-brand-accent-100 mt-2 font-bold uppercase text-xs tracking-widest">Años de experiencia</p>
              </div>
              <div>
                <p className="text-4xl md:text-5xl font-black tracking-tighter">50+</p>
                <p className="text-brand-accent-100 mt-2 font-bold uppercase text-xs tracking-widest">Trabajadores</p>
              </div>
              <div>
                <p className="text-4xl md:text-5xl font-black tracking-tighter">10k+</p>
                <p className="text-brand-accent-100 mt-2 font-bold uppercase text-xs tracking-widest">Clientes felices</p>
              </div>
              <div>
                <p className="text-4xl md:text-5xl font-black tracking-tighter">5k+</p>
                <p className="text-brand-accent-100 mt-2 font-bold uppercase text-xs tracking-widest">Productos</p>
              </div>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="mb-16">
          <h2 className="text-3xl font-black text-gray-900 dark:text-white text-center mb-12 uppercase tracking-tighter">
            Nuestro Equipo
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Rodrigo Nuñez',
                role: 'Desarrollador Principal',
                image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop',
              },
              {
                name: 'María González',
                role: 'Gerente General',
                image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop',
              },
              {
                name: 'Carlos Rodríguez',
                role: 'Jefe de Operaciones',
                image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop',
              },
            ].map((member) => (
              <div key={member.name} className="text-center group">
                <div className="relative w-32 h-32 mx-auto mb-4">
                    <Image
                      src={member.image}
                      alt={member.name}
                      width={128}
                      height={128}
                      unoptimized
                      className="w-full h-full rounded-2xl object-cover shadow-lg group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-brand-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">{member.name}</h3>
                <p className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-widest">{member.role}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact Info */}
        <section>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white text-center mb-12 uppercase tracking-tighter">
            Visítanos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="rounded-[2rem] border-none shadow-lg">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                  <MapPin className="h-6 w-6 text-brand-primary" />
                </div>
                <div>
                  <h3 className="font-black dark:text-white uppercase tracking-tighter text-sm">Dirección</h3>
                  <p className="text-gray-500 text-xs font-medium">Calle Principal 456, Castro, Chiloé</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-[2rem] border-none shadow-lg">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                  <Phone className="h-6 w-6 text-brand-primary" />
                </div>
                <div>
                  <h3 className="font-black dark:text-white uppercase tracking-tighter text-sm">Teléfono</h3>
                  <p className="text-gray-500 text-xs font-medium">+56 2 2345 6789</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-[2rem] border-none shadow-lg">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                  <Clock className="h-6 w-6 text-brand-primary" />
                </div>
                <div>
                  <h3 className="font-black dark:text-white uppercase tracking-tighter text-sm">Horario</h3>
                  <p className="text-gray-500 text-xs font-medium">Lun-Dom: 8:00 - 21:00</p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-12 text-center">
            <Link href="/contacto">
              <Button size="lg" className="bg-brand-primary hover:bg-brand-700 text-white rounded-2xl px-12 font-black uppercase tracking-widest text-xs shadow-xl shadow-brand-primary/20">
                Contáctanos
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
