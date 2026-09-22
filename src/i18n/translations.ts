import type { UILanguage } from '../types/index.ts';

export const translations = {
  ru: {
    appTitle: 'CheckLister',
    appSubtitle: 'Локальная библиотека',
    navLibrary: 'Библиотека',
    navSettings: 'Настройки',
    navDev: 'Консоль Dev',

    // Filters
    filterAll: 'Все тайтлы',
    filterWatching: 'Смотрю',
    filterCompleted: 'Завершено',
    filterAiring: 'Онгоинги',
    filterMissing: 'Потерянные файлы',

    // Header & Actions
    searchPlaceholder: 'Поиск по названию, ромадзи или папке...',
    btnScan: 'Сканировать',
    btnAddFolder: 'Добавить папку',
    scanningStatus: 'Сканирование...',
    progressLabel: 'Прогресс просмотра',
    totalFiles: 'файлов',

    // Card & Status
    statusWatching: 'Смотрится',
    statusCompleted: 'Завершено',
    statusAiring: 'Онгоинг',
    statusMissing: 'Файл не найден',
    btnContinue: 'Продолжить',
    btnShowFolder: 'Открыть папку',
    btnDeleteAnime: 'Удалить из библиотеки',
    confirmDeleteAnime: 'Удалить этот тайтл из библиотеки?',
    confirmClearLibrary: 'Вы уверены, что хотите полностью очистить библиотеку?',
    libraryClearedToast: 'Библиотека очищена',
    noCover: 'Нет постера',

    // Detail View
    backToLibrary: 'Назад к библиотеке',
    scoreLabel: 'Оценка',
    episodesCount: 'серий',
    nextEpisodeIn: 'След. серия',
    synopsisTitle: 'Синопсис',
    episodesHeader: 'Список серий',
    tableStatusSize: 'Статус / Размер',
    btnPlayInPlayer: 'Открыть в плеере',
    btnShowInExplorer: 'Показать файл в проводнике',
    btnRemap: 'Редактировать привязку',
    viewOnAnilist: 'Открыть на AniList',
    noEpisodesDiscovered: 'В этой папке видеофайлы не найдены.',
    allEpisodesWatched: 'Все серии просмотрены',
    watchProgress: 'Прогресс просмотра',

    // Settings View
    settingsTitle: 'Настройки приложения',
    settingsSubtitle: 'Управление каталогами библиотеки, внешним плеером и интерфейсом.',
    sectionFoldersTitle: 'Папки библиотеки',
    sectionFoldersDesc: 'Каталоги на диске, в которых хранятся видеофайлы и сезоны аниме.',
    btnBrowse: 'Обзор...',
    btnAddPath: 'Добавить путь',
    pathPlaceholder: 'Или вставьте путь к папке (например: D:\\Anime)...',
    noFoldersConfigured: 'Папки еще не добавлены. Нажмите «Обзор» или введите путь вручную.',

    sectionPlayerTitle: 'Видеоплеер для просмотра',
    sectionPlayerDesc: 'Программа, которая будет запускаться при открытии видео.',
    playerSystemDefault: 'Системный плеер по умолчанию',
    playerSystemDefaultDesc: 'Используется ассоциация файлов Windows (MPC-HC, PotPlayer, VLC, Windows Media).',
    playerCustom: 'Кастомный путь к плееру',
    playerCustomDesc: 'Прямой запуск бинарного файла (например: mpv.exe, vlc.exe).',
    customPlayerPlaceholder: 'C:\\Program Files\\mpv\\mpv.exe',

    sectionLangTitle: 'Язык и метаданные',
    langSelectLabel: 'Язык интерфейса',
    preferRussianLabel: 'Предпочитать русские названия тайтлов',
    preferRussianDesc: 'Отображать названия и синопсисы из Shikimori при их наличии.',
    autoScanLabel: 'Автоматическое сканирование при старте',
    autoScanDesc: 'Проверять новые и перемещенные файлы при каждом запуске программы.',

    sectionDevTitle: 'Инструменты разработчика (Chrome DevTools)',
    sectionDevDesc: 'Активирует встроенную панель отладки Chrome DevTools для инспекции интерфейса.',
    devModeLabel: 'Включить Chrome DevTools (F12)',
    devModeWarning: 'Открывает стандартную панель веб-инспектора Chrome для глубокой отладки.',

    sectionDataTitle: 'Управление данными и базой',
    sectionDataDesc: 'Сброс локальной базы данных библиотеки и очистка кэша.',
    clearLibraryDesc: 'Полностью удаляет все распознанные тайтлы из базы данных и очищает список папок. Файлы на вашем диске затронуты не будут.',

    btnSaveSettings: 'Сохранить настройки',
    settingsSavedToast: 'Настройки сохранены',

    // About & Updates
    sectionAboutTitle: 'О приложении',
    sectionAboutDesc: 'Информация о версии, репозиторий и онлайн-обновления CheckLister.',
    currentVersionLabel: 'Текущая версия',
    repoLinkLabel: 'Репозиторий GitHub',
    btnCheckUpdates: 'Проверить обновления',
    checkingUpdates: 'Проверка обновлений...',
    latestVersionInstalled: 'У вас установлена последняя версия',
    updateAvailableTitle: 'Доступно обновление',
    btnDownloadUpdate: 'Скачать обновление',
    btnViewReleaseNotes: 'Что нового',
    updateCheckError: 'Не удалось проверить обновления',
    releaseNotesTitle: 'Список изменений',

    // Remap Modal
    remapTitle: 'Ручная привязка метаданных',
    currentFolderLabel: 'Текущая папка:',
    remapSearchPlaceholder: 'Поиск тайтла в AniList / Shikimori...',
    btnSearch: 'Поиск',
    btnApply: 'Применить',
    searchingExternal: 'Запрос к базам данных...',
    noCandidatesFound: 'Ничего не найдено. Попробуйте уточнить запрос.',
    initialCandidateHint: 'Введите название выше и нажмите «Поиск».',
    providerLabel: 'Источник поиска:',
    providerAll: 'Все (Shikimori + AniList)',
    providerShikimori: 'Shikimori (RU)',
    providerAniList: 'AniList (EN)',

    // Dev View
    devConsoleTitle: 'Консоль разработчика',
    devConsoleDesc: 'Инструменты диагностики, инспекции локального хранилища и тестирования плеера.',
    btnReseedSample: 'Сбросить и восстановить демо-данные',
    btnClearLibrary: 'Полная очистка библиотеки',
    btnTestPlayer: 'Тестовый запуск плеера',
    rawDbJson: 'Сырые данные библиотеки (JSON)',

    // Empty States
    emptyLibraryTitle: 'Библиотека пуста',
    emptyLibraryDesc: 'Добавьте папки с аниме в настройках, чтобы программа просканировала видеофайлы.',
    emptySearchTitle: 'Ничего не найдено',
    emptySearchDesc: 'По вашему запросу совпадений нет. Попробуйте изменить ключевые слова.',
    emptyWatchingTitle: 'Нет активных просмотров',
    emptyWatchingDesc: 'Здесь появятся аниме, просмотр которых вы уже начали.',
    emptyCompletedTitle: 'Нет завершенных тайтлов',
    emptyCompletedDesc: 'После просмотра всех эпизодов тайтл переместится в эту категорию.',
    emptyAiringTitle: 'Нет онгоингов',
    emptyAiringDesc: 'В коллекции нет сериалов со статусом продолжающегося релиза.',
    emptyMissingTitle: 'Потерянных файлов нет',
    emptyMissingDesc: 'Все распознанные видеофайлы присутствуют на диске.',
  },

  en: {
    appTitle: 'CheckLister',
    appSubtitle: 'Local Library & Tracker',
    navLibrary: 'Library',
    navSettings: 'Settings',
    navDev: 'Dev Console',

    // Filters
    filterAll: 'All Titles',
    filterWatching: 'Watching',
    filterCompleted: 'Completed',
    filterAiring: 'Airing',
    filterMissing: 'Missing Files',

    // Header & Actions
    searchPlaceholder: 'Search by title, romaji, or folder...',
    btnScan: 'Scan',
    btnAddFolder: 'Add Folder',
    scanningStatus: 'Scanning...',
    progressLabel: 'Watch Progress',
    totalFiles: 'files',

    // Card & Status
    statusWatching: 'Watching',
    statusCompleted: 'Completed',
    statusAiring: 'Airing',
    statusMissing: 'Missing',
    btnContinue: 'Continue',
    btnShowFolder: 'Open Folder',
    btnDeleteAnime: 'Remove from Library',
    confirmDeleteAnime: 'Remove this anime from library?',
    confirmClearLibrary: 'Are you sure you want to clear the entire library?',
    libraryClearedToast: 'Library cleared',
    noCover: 'No Cover',

    // Detail View
    backToLibrary: 'Back to Library',
    scoreLabel: 'Score',
    episodesCount: 'episodes',
    nextEpisodeIn: 'Next ep',
    synopsisTitle: 'Synopsis',
    episodesHeader: 'Episode List',
    tableStatusSize: 'Status / Size',
    btnPlayInPlayer: 'Play in player',
    btnShowInExplorer: 'Show file in Explorer',
    btnRemap: 'Remap Metadata',
    viewOnAnilist: 'View on AniList',
    noEpisodesDiscovered: 'No video files discovered in this folder.',
    allEpisodesWatched: 'All episodes watched',
    watchProgress: 'Watch Progress',

    // Settings View
    settingsTitle: 'Application Settings',
    settingsSubtitle: 'Manage library directories, external media player, and preferences.',
    sectionFoldersTitle: 'Anime Directories',
    sectionFoldersDesc: 'Directories on disk scanned for anime videos and subfolders.',
    btnBrowse: 'Browse...',
    btnAddPath: 'Add Path',
    pathPlaceholder: 'Or paste directory path (e.g. D:\\Anime)...',
    noFoldersConfigured: 'No folders added yet. Click Browse or add a path manually.',

    sectionPlayerTitle: 'Video Player Launcher',
    sectionPlayerDesc: 'Executable used when launching video files.',
    playerSystemDefault: 'System Default Player',
    playerSystemDefaultDesc: 'Launches using Windows default associated media player (MPC-HC, PotPlayer, VLC).',
    playerCustom: 'Custom Executable Path',
    playerCustomDesc: 'Direct binary execution (e.g. mpv.exe, vlc.exe).',
    customPlayerPlaceholder: 'C:\\Program Files\\mpv\\mpv.exe',

    sectionLangTitle: 'Language & Metadata',
    langSelectLabel: 'Interface Language',
    preferRussianLabel: 'Prefer Russian Titles',
    preferRussianDesc: 'Display titles and synopses from Shikimori when available.',
    autoScanLabel: 'Auto-scan on Application Startup',
    autoScanDesc: 'Verify existing and newly added files each time the app launches.',

    sectionDevTitle: 'Developer Tools (Chrome DevTools)',
    sectionDevDesc: 'Enables built-in Chrome DevTools inspector panel for app debugging.',
    devModeLabel: 'Enable Chrome DevTools (F12)',
    devModeWarning: 'Opens the standard Chrome web developer tools panel.',

    sectionDataTitle: 'Data Management & Storage',
    sectionDataDesc: 'Reset the local library database and clear metadata cache.',
    clearLibraryDesc: 'Completely removes all recognized titles from the database and clears the folder list. Files on your disk will remain untouched.',

    btnSaveSettings: 'Save Settings',
    settingsSavedToast: 'Settings saved',

    // About & Updates
    sectionAboutTitle: 'About Application',
    sectionAboutDesc: 'Version information, repository link, and online updates for CheckLister.',
    currentVersionLabel: 'Current Version',
    repoLinkLabel: 'GitHub Repository',
    btnCheckUpdates: 'Check for Updates',
    checkingUpdates: 'Checking for updates...',
    latestVersionInstalled: 'You have the latest version installed',
    updateAvailableTitle: 'Update Available',
    btnDownloadUpdate: 'Download Update',
    btnViewReleaseNotes: 'Release Notes',
    updateCheckError: 'Failed to check for updates',
    releaseNotesTitle: 'Changelog',

    // Remap Modal
    remapTitle: 'Remap Anime Metadata',
    currentFolderLabel: 'Current folder:',
    remapSearchPlaceholder: 'Search title on AniList / Shikimori...',
    btnSearch: 'Search',
    btnApply: 'Apply',
    searchingExternal: 'Querying external databases...',
    noCandidatesFound: 'No matching anime found. Try another search query.',
    initialCandidateHint: 'Enter a title above and press Search.',
    providerLabel: 'Search Source:',
    providerAll: 'All (Shikimori + AniList)',
    providerShikimori: 'Shikimori (RU)',
    providerAniList: 'AniList (EN)',

    // Dev View
    devConsoleTitle: 'Developer Console',
    devConsoleDesc: 'Diagnostic tools, local storage inspection, and media player test triggers.',
    btnReseedSample: 'Reset & Reseed Demo Data',
    btnClearLibrary: 'Clear Entire Library',
    btnTestPlayer: 'Test Player Execution',
    rawDbJson: 'Raw Library Data (JSON)',

    // Empty States
    emptyLibraryTitle: 'Library is empty',
    emptyLibraryDesc: 'Configure anime directories in Settings to scan video files from your disk.',
    emptySearchTitle: 'No matches found',
    emptySearchDesc: 'No releases match your search query. Try adjusting keywords.',
    emptyWatchingTitle: 'No active shows in progress',
    emptyWatchingDesc: 'Shows that you have started watching will appear here.',
    emptyCompletedTitle: 'No completed anime yet',
    emptyCompletedDesc: 'Once you watch all episodes of an anime, it moves here.',
    emptyAiringTitle: 'No airing anime',
    emptyAiringDesc: 'No shows with releasing status discovered in your collection.',
    emptyMissingTitle: 'No missing files',
    emptyMissingDesc: 'All recognized video files are verified on disk.',
  },
} as const;

export type TranslationKey = keyof typeof translations['en'];

export function useI18n(lang: UILanguage = 'ru') {
  const dict = translations[lang] || translations.ru;
  const t = (key: TranslationKey): string => {
    return (dict as any)[key] || (translations.en as any)[key] || key;
  };
  return { t, currentLang: lang };
}
