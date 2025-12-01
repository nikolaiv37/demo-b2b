import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const currentLang = i18n.language || 'en'
  const isEnglish = currentLang === 'en'

  const toggleLanguage = () => {
    const newLang = isEnglish ? 'bg' : 'en'
    i18n.changeLanguage(newLang)
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className={cn(
        'h-9 px-3 gap-2 hover:bg-gray-100 dark:hover:bg-gray-800',
        'text-sm font-medium text-gray-700 dark:text-gray-300',
        'transition-colors duration-150'
      )}
      aria-label={isEnglish ? 'Switch to Bulgarian' : 'Switch to English'}
    >
      <span className="font-mono text-xs">
        {isEnglish ? 'EN' : 'БГ'}
      </span>
    </Button>
  )
}

