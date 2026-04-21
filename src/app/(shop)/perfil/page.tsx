"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  User, 
  Package, 
  Heart, 
  MapPin, 
  Gift,
  LogOut,
  Edit2,
  Camera,
  Loader,
  MessageSquare,
  Star,
  ChevronRight,
  ShieldCheck,
  UserCircle
} from 'lucide-react';
import { formatRut, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores';
import { getProducts } from '@/lib/api';

function ProfileContent() {
  const navigate = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'profile';
  
  const [activeTab, setActiveTab] = useState(defaultTab);
  const { user: currentUser, logout, updateUser: updateProfile, refreshProfile } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync activeTab with URL search params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    const syncProfile = async () => {
      setIsSyncing(true);
      await refreshProfile();
      setIsSyncing(false);
    };
    syncProfile();
    
    getProducts().then((res: any) => setProducts(Array.isArray(res) ? res : res.products || []));
  }, []);
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: currentUser?.firstName || '',
    lastName: currentUser?.lastName || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    rut: currentUser?.rut || '',
    address: currentUser?.addresses?.[0]?.street || '',
  });

  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        email: currentUser.email || '',
        phone: currentUser.phone || currentUser.phone || '',
        rut: currentUser.rut || '',
        address: currentUser.addresses?.[0]?.street || '',
      });
    }
  }, [currentUser]);

  if (!currentUser) {
    navigate.push('/login');
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate.push('/');
  };

  const handleSave = () => {
    updateProfile(formData);
    setIsEditing(false);
  };

  const wishlistProducts = products.filter((p: any) => currentUser.wishlist && currentUser.wishlist.includes(p.id));

  const menuItems = [
    { id: 'profile', label: 'Mi Perfil', icon: UserCircle },
    { id: 'orders', label: 'Mis Compras', icon: Package },
    { id: 'wishlist', label: 'Mis Favoritos', icon: Heart },
    { id: 'questions', label: 'Mis Preguntas', icon: MessageSquare },
    { id: 'opinions', label: 'Mis Opiniones', icon: Star },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar / Menu */}
          <div className="lg:col-span-4 space-y-4">
            {/* User Info Card */}
            <Card className="border-none shadow-xl shadow-blue-500/5 overflow-hidden rounded-3xl bg-white dark:bg-gray-900">
              <CardContent className="p-0">
                <div className="p-8 text-center border-b border-gray-100 dark:border-gray-800">
                  <div className="relative inline-block group mb-4">
                    <div className="w-28 h-28 bg-gradient-to-br from-corporate-blue to-blue-700 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/20 ring-4 ring-white dark:ring-gray-800">
                      <span className="text-white text-4xl font-black">
                        {(currentUser.name || currentUser.firstName || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <button className="absolute bottom-1 right-1 w-9 h-9 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-corporate-blue shadow-lg transition-transform hover:scale-110 active:scale-95">
                      <Camera className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                      {currentUser.firstName} {currentUser.lastName}
                    </h2>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <div className={cn(
                        "flex items-center gap-1.5 py-1 px-3 rounded-full",
                        currentUser.role === 'admin' ? "bg-rose-50 dark:bg-rose-900/30" :
                        currentUser.role === 'developer' ? "bg-purple-50 dark:bg-purple-900/30" :
                        currentUser.role === 'manager' ? "bg-blue-50 dark:bg-blue-900/30" :
                        "bg-gray-50 dark:bg-gray-800/50"
                      )}>
                        {isSyncing ? (
                          <Loader className="w-3 h-3 animate-spin text-corporate-blue" />
                        ) : (
                          <ShieldCheck className={cn(
                            "w-3.5 h-3.5",
                            currentUser.role === 'admin' ? "text-rose-500" :
                            currentUser.role === 'developer' ? "text-purple-500" :
                            currentUser.role === 'manager' ? "text-blue-500" :
                            "text-gray-500"
                          )} />
                        )}
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-wider",
                          currentUser.role === 'admin' ? "text-rose-600" :
                          currentUser.role === 'developer' ? "text-purple-600" :
                          currentUser.role === 'manager' ? "text-blue-600" :
                          "text-gray-600"
                        )}>
                          {isSyncing ? 'Sincronizando...' : (
                            currentUser.role === 'admin' ? 'Administrador' : 
                            currentUser.role === 'developer' ? 'Desarrollador' :
                            currentUser.role === 'manager' ? 'Gerente' : 'Cliente'
                          )}
                        </span>
                      </div>
                      
                      {currentUser.rut && !isSyncing && (
                        <div className="flex items-center gap-1.5 py-1 px-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">
                            RUT: {currentUser.rut}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Loyalty Bar Section */}
                <div className="p-6 bg-gray-50/50 dark:bg-gray-800/30">
                  <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                        <Gift className="h-5 w-5 text-amber-600 group-hover:scale-110 transition-transform" />
                      </div>
                      <div>
                        <p className="text-xl font-black text-gray-900 dark:text-white leading-none">
                          {currentUser.loyaltyPoints || 0}
                        </p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Puntos Austral</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </div>

                {/* Vertical Navigation Menu */}
                <div className="p-4 space-y-1">
                  <p className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">Mi Cuenta</p>
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${
                        activeTab === item.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-corporate-blue shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${activeTab === item.id ? 'text-corporate-blue' : 'text-gray-400'}`} />
                        <span className={`font-bold transition-colors ${activeTab === item.id ? 'text-gray-900 dark:text-white' : ''}`}>
                          {item.label}
                        </span>
                      </div>
                      {activeTab === item.id && <div className="w-1.5 h-1.5 bg-corporate-blue rounded-full" />}
                    </button>
                  ))}
                  
                  <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 p-4 rounded-2xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 font-bold transition-all group"
                    >
                      <LogOut className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-8">
            <div className="space-y-6">
              {activeTab === 'profile' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="border-none shadow-xl shadow-blue-500/5 rounded-3xl overflow-hidden">
                    <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-2xl font-black tracking-tight">Información Personal</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">Gestiona tus datos y preferencias</p>
                      </div>
                      <Button 
                        variant={isEditing ? "default" : "outline"} 
                        onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                        className="rounded-full font-bold px-6"
                      >
                        {isEditing ? 'Guardar Cambios' : <><Edit2 className="h-4 w-4 mr-2" /> Editar Perfil</>}
                      </Button>
                    </CardHeader>
                    <CardContent className="p-8 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="font-bold text-xs uppercase tracking-widest text-gray-400">Nombre</Label>
                          <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            disabled={!isEditing}
                            className="rounded-xl border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 h-12 font-medium"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold text-xs uppercase tracking-widest text-gray-400">Apellido</Label>
                          <Input
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            disabled={!isEditing}
                            className="rounded-xl border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 h-12 font-medium"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold text-xs uppercase tracking-widest text-gray-400">Correo Electrónico</Label>
                          <Input
                            value={formData.email}
                            disabled
                            type="email"
                            className="rounded-xl border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 h-12 font-medium opacity-70"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold text-xs uppercase tracking-widest text-gray-400">Teléfono</Label>
                          <Input
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            disabled={!isEditing}
                            type="tel"
                            className="rounded-xl border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 h-12 font-medium"
                          />
                        </div>
                         <div className="space-y-2 md:col-span-2">
                           <div className="flex items-center justify-between">
                             <Label className="font-bold text-xs uppercase tracking-widest text-gray-400">RUT</Label>
                             {currentUser.identityVerified && (
                               <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                 <ShieldCheck className="w-3 h-3" />
                                 Identidad Verificada
                               </span>
                             )}
                           </div>
                           <Input
                             value={formData.rut}
                             onChange={(e) => setFormData({ ...formData, rut: formatRut(e.target.value) })}
                             disabled={!isEditing || currentUser.identityVerified}
                             className={cn(
                               "rounded-xl border-gray-200 dark:border-gray-800 h-12 font-medium",
                               currentUser.identityVerified ? "bg-emerald-50/30 border-emerald-100 opacity-80" : "bg-gray-50 dark:bg-gray-800/50"
                             )}
                             placeholder="12.345.678-9"
                           />
                           {currentUser.identityVerified && (
                             <p className="text-[10px] text-gray-400 font-medium ml-1">
                               Este RUT ha sido validado físicamente con tu cédula y no puede ser modificado.
                             </p>
                           )}
                         </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label className="font-bold text-xs uppercase tracking-widest text-gray-400">Dirección</Label>
                          <Input
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            disabled={!isEditing}
                            className="rounded-xl border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 h-12 font-medium"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'orders' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="border-none shadow-xl shadow-blue-500/5 rounded-3xl overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                      <CardTitle className="text-2xl font-black tracking-tight">Historial de Compras</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">Revisa tus pedidos anteriores y su estado</p>
                    </CardHeader>
                    <CardContent className="p-8 pt-4">
                      {(currentUser.purchaseHistory || []).length > 0 ? (
                        <div className="space-y-4">
                          {(currentUser.purchaseHistory || []).map((order: any) => (
                            <div key={order.id} className="group p-5 border border-gray-100 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-all">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                                    <Package className="w-6 h-6 text-corporate-blue" />
                                  </div>
                                  <div>
                                    <p className="font-black text-gray-900 dark:text-white">Pedido #{order.id}</p>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                      {new Date(order.date).toLocaleDateString('es-CL')}
                                    </p>
                                  </div>
                                </div>
                                <Badge className="rounded-full px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-none">
                                  {order.status === 'delivered' ? 'Entregado' : order.status}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-800">
                                <p className="text-sm text-gray-500 font-medium">{order.items.length} productos</p>
                                <p className="text-lg font-black text-gray-900 dark:text-white">${order.total.toLocaleString('es-CL')}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-16 bg-gray-50/50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4 opacity-50" />
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Sin compras aún</h3>
                          <p className="text-sm text-gray-500 mt-2">¡Comienza a comprar y acumula Puntos Austral!</p>
                          <Button onClick={() => navigate.push('/productos')} className="mt-6 rounded-full font-bold px-8">Explorar Productos</Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'wishlist' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="border-none shadow-xl shadow-blue-500/5 rounded-3xl overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                      <CardTitle className="text-2xl font-black tracking-tight">Mis Favoritos</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">Productos que te interesan para después</p>
                    </CardHeader>
                    <CardContent className="p-8 pt-4">
                      {wishlistProducts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {wishlistProducts.map((product: any) => (
                            <div key={product.id} className="group flex gap-4 p-4 border border-gray-100 dark:border-gray-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-all">
                              <div className="w-24 h-24 bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm flex-shrink-0">
                                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 dark:text-white line-clamp-1 group-hover:text-corporate-blue transition-colors">{product.name}</p>
                                <p className="text-xl font-black text-rose-500 mt-1">${product.price.toLocaleString('es-CL')}</p>
                                <Button size="sm" variant="ghost" className="mt-2 text-xs font-bold text-corporate-blue hover:bg-blue-50 rounded-full px-4" onClick={() => navigate.push(`/producto/${product.slug}`)}>
                                  Ver Detalles
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-16 bg-gray-50/50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                          <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4 opacity-50" />
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Tu lista está vacía</h3>
                          <p className="text-sm text-gray-500 mt-2">Guarda los productos que más te gustan aquí</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'questions' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="border-none shadow-xl shadow-blue-500/5 rounded-3xl overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                      <CardTitle className="text-2xl font-black tracking-tight">Mis Preguntas</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">Historial de tus consultas sobre productos</p>
                    </CardHeader>
                    <CardContent className="p-8 pt-4">
                      <div className="text-center py-20 bg-gray-50/50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                        <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Aún no has hecho preguntas</h3>
                        <p className="text-sm text-gray-500 mt-2">Aquí verás las respuestas de nuestro equipo a tus dudas</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'opinions' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card className="border-none shadow-xl shadow-blue-500/5 rounded-3xl overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                      <CardTitle className="text-2xl font-black tracking-tight">Mis Opiniones</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">Reseñas y valoraciones que has compartido</p>
                    </CardHeader>
                    <CardContent className="p-8 pt-4">
                      <div className="text-center py-20 bg-gray-50/50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                        <Star className="h-16 w-16 text-gray-300 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Sin opiniones registradas</h3>
                        <p className="text-sm text-gray-500 mt-2">¡Ayuda a otros comprando y valorando tus productos!</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-red-600" />
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
