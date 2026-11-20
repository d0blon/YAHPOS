"use client";

import { useState } from 'react';
import Image from 'next/image';
import { Clock, Users, ChefHat, ArrowRight, Search, Flame, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface Recipe {
  id: number;
  title: string;
  description: string;
  image: string;
  difficulty: 'facil' | 'medio' | 'dificil';
  prepTime: number;
  cookTime: number;
  servings: number;
  tags: string[];
}

const mockRecipes: Recipe[] = [
  {
    id: 1,
    title: 'Cazuela de Vacuno',
    description: 'Tradicional cazuela chilena con carne de vacuno de nuestra región.',
    image: 'https://images.unsplash.com/photo-1548943487-a2e4e43b4820?w=800&auto=format&fit=crop',
    difficulty: 'medio',
    prepTime: 20,
    cookTime: 60,
    servings: 4,
    tags: ['Tradicional', 'Sopa', 'Carne'],
  }
];

const difficultyColors = {
  facil: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  medio: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
  dificil: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
};

const difficultyLabels = {
  facil: 'Fácil',
  medio: 'Medio',
  dificil: 'Difícil',
};

export default function Recipes() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);

  const filteredRecipes = mockRecipes.filter((recipe) => {
    const matchesSearch = recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         recipe.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDifficulty = !selectedDifficulty || recipe.difficulty === selectedDifficulty;
    return matchesSearch && matchesDifficulty;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">
      {/* Hero */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <ChefHat className="h-6 w-6" />
              <span className="text-orange-100 font-bold uppercase tracking-widest">Recetas YAHPOS!</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Cocina con los Mejores Productos
            </h1>
            <p className="text-xl text-orange-100 mb-8">
              Descubre deliciosas recetas usando productos frescos de YAHPOS!
            </p>
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="search"
                placeholder="Buscar recetas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-full text-gray-900"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          <Button
            variant={selectedDifficulty === null ? 'default' : 'outline'}
            onClick={() => setSelectedDifficulty(null)}
          >
            Todas
          </Button>
          {(['facil', 'medio', 'dificil'] as const).map((diff) => (
            <Button
              key={diff}
              variant={selectedDifficulty === diff ? 'default' : 'outline'}
              onClick={() => setSelectedDifficulty(diff)}
            >
              {difficultyLabels[diff]}
            </Button>
          ))}
        </div>

        {/* Recipes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <Card key={recipe.id} className="overflow-hidden group">
              <div className="relative aspect-video overflow-hidden">
                <Image
                  src={recipe.image}
                  alt={recipe.title}
                  width={800}
                  height={450}
                  unoptimized
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3">
                  <Badge className={difficultyColors[recipe.difficulty as keyof typeof difficultyColors]}>
                    {difficultyLabels[recipe.difficulty as keyof typeof difficultyLabels]}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {recipe.prepTime + recipe.cookTime} min
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {recipe.servings} porciones
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-red-600 transition-colors">
                  {recipe.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-4">
                  {recipe.description}
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {recipe.tags.slice(0, 3).map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <Button variant="outline" className="w-full">
                  Ver Receta
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredRecipes.length === 0 && (
          <div className="text-center py-12">
            <ChefHat className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              No se encontraron recetas
            </h3>
            <p className="text-gray-500">
              Intenta con otros términos de búsqueda
            </p>
          </div>
        )}

        {/* Featured Recipe */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Receta Destacada
          </h2>
          <Card className="overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="aspect-video lg:aspect-auto">
                <Image
                  src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop"
                  alt="Parrillada Chilena"
                  width={800}
                  height={450}
                  unoptimized
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-8">
                <Badge className="mb-4 bg-red-600">Especial</Badge>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  Parrillada Chilena Completa
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  La receta perfecta para un asado con amigos y familia. Incluye cortes 
                  premium de carne, chorizos, morcilla y todos los acompañamientos tradicionales.
                </p>
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <Timer className="h-5 w-5 text-red-600" />
                    <span className="text-sm">Prep: 30 min</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-red-600" />
                    <span className="text-sm">Cocción: 45 min</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-red-600" />
                    <span className="text-sm">6-8 porciones</span>
                  </div>
                </div>
                <Button className="bg-red-600 hover:bg-red-700">
                  Ver Receta Completa
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </CardContent>
            </div>
          </Card>
        </section>

        {/* CTA */}
        <section className="mt-16">
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-8 md:p-12 text-white text-center">
            <h2 className="text-3xl font-bold mb-4">
              ¿Tienes una receta para compartir?
            </h2>
            <p className="text-green-100 mb-6 max-w-xl mx-auto">
              Envíanos tus recetas usando productos de YAHPOS! y podría ser
              publicada en nuestra web con tu nombre.
            </p>
            <Button variant="secondary" size="lg">
              Enviar Receta
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
