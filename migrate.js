const fs = require('fs');

const pagesMap = {
  'About.tsx': 'src/app/(shop)/nosotros/page.tsx',
  'Contact.tsx': 'src/app/(shop)/contacto/page.tsx',
  'Register.tsx': 'src/app/(auth)/registro/page.tsx',
  'Profile.tsx': 'src/app/(shop)/perfil/page.tsx',
  'Recipes.tsx': 'src/app/(shop)/recetas/page.tsx',
  'FlowConfirmation.tsx': 'src/app/(cart)/flow-confirmation/page.tsx'
};

const sourceDir = 'C:/Users/Blaz Baez/Desktop/proyecto eccomerce/app/src/pages';

Object.keys(pagesMap).forEach(page => {
  let content = fs.readFileSync(`${sourceDir}/${page}`, 'utf8');
  let initContent = content;

  if (!content.includes('"use client"') && !content.includes("'use client'")) {
    if (content.includes('useState') || 
        content.includes('useEffect') || 
        content.includes('useLocation') || 
        content.includes('usePathname') || 
        content.includes('onClick') || 
        content.includes('useCartStore') || 
        content.includes('useAuthStore') || 
        content.includes('create(') ||
        content.includes('useRouter') ||
        content.includes('useSearchParams')) {
      content = '"use client";\n\n' + content;
    }
  }

  content = content.replace(/import\s*\{?\s*Link\s*\}?\s*from\s*['"]react-router-dom['"];?/g, "import Link from 'next/link';");
  content = content.replace(/import\s*\{[^}]*useLocation[^}]*\}\s*from\s*['"]react-router-dom['"];?/g, "import { usePathname } from 'next/navigation';");
  content = content.replace(/import\s*\{[^}]*useParams[^}]*\}\s*from\s*['"]react-router-dom['"];?/g, "import { useParams } from 'next/navigation';");
  content = content.replace(/import\s*\{[^}]*useNavigate[^}]*\}\s*from\s*['"]react-router-dom['"];?/g, "import { useRouter } from 'next/navigation';");
  content = content.replace(/import\s*\{[^}]*useSearchParams[^}]*\}\s*from\s*['"]react-router-dom['"];?/g, "import { useSearchParams } from 'next/navigation';");
  content = content.replace(/const navigate = useNavigate\(\)/g, "const navigate = useRouter()");
  content = content.replace(/<Link([^>]+)to=/g, '<Link$1href=');
  content = content.replace(/const \{ pathname \} = useLocation\(\)/g, "const pathname = usePathname()");

  fs.writeFileSync(pagesMap[page], content, 'utf8');
  console.log('Copied and migrated: ' + page);
});
