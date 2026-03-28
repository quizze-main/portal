import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { EmployeeAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ProfilePhotoGalleryModal } from "@/components/ProfilePhotoGalleryModal";
import GreenFeedbackModal from "@/components/GreenFeedbackModal";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Crown, RefreshCw, Trash2, Building, Upload, User, Pencil, Check, X } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { useEmployee } from "@/contexts/EmployeeProvider";
import { internalApiClient, Employee as EmployeeType, Manager } from "@/lib/internalApiClient";
import type { UserSettingsResponse } from "@/lib/internalApiClient";
import { useVersion } from "@/hooks/useVersion";
import { logger } from '@/lib/logger';
import { detectClientVariant as detectClientVariantStatic } from "@/lib/clientVariant";
import { ProfileCalendarWidget } from "@/components/profile/ProfileCalendarWidget";

export const Profile = () => {
  const { employee, reloadEmployee, canUseLeaderDashboard, userSettings, reloadUserSettings, storeId } = useEmployee();
  const DEFAULT_TEAM_TITLE = "Моя команда";
  const DEFAULT_MANAGER_TITLE = "Руководитель";

  const [teamTitle, setTeamTitle] = useState(DEFAULT_TEAM_TITLE);
  const [managerSectionTitle, setManagerSectionTitle] = useState(DEFAULT_MANAGER_TITLE);
  const [editSection, setEditSection] = useState<"team" | "manager" | null>(null);
  const [editDraft, setEditDraft] = useState("");

  // Remote settings (Frappe) metadata for save behavior
  const remoteMetaRef = useRef<{ mode: string; saveVariant: string }>({ mode: 'shared_only', saveVariant: 'shared' });

  // Use shared detector (Telegram Desktop can be narrow side-panel).
  const detectClientVariant = useCallback(() => detectClientVariantStatic(), []);

  const pickVariantForSave = useCallback((settings: any) => {
    const mode = (settings?.active_variant_mode ? String(settings.active_variant_mode) : 'shared_only').trim() || 'shared_only';
    if (mode === 'per_variant') return { mode, saveVariant: detectClientVariant() };
    return { mode, saveVariant: 'shared' };
  }, [detectClientVariant]);

  const [manager, setManager] = useState<Manager | null>(null);
  const [loadingManager, setLoadingManager] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [greenOpen, setGreenOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const [viewPhotoOpen, setViewPhotoOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [photoItems, setPhotoItems] = useState<Array<{ file_url: string; file_name?: string; creation?: string; name?: string }>>([]);
  const [loadingPhotoItems, setLoadingPhotoItems] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [managerPhotoOpen, setManagerPhotoOpen] = useState(false);
  const [managerPhotoVersion, setManagerPhotoVersion] = useState<number>(0);
  const [managerPhotoItems, setManagerPhotoItems] = useState<Array<{ file_url: string; file_name?: string; creation?: string; name?: string }>>([]);
  const [loadingManagerPhotos, setLoadingManagerPhotos] = useState(false);
  const [managersList, setManagersList] = useState<EmployeeType[]>([]);
  const [loadingManagersList, setLoadingManagersList] = useState(false);
  const [managersListError, setManagersListError] = useState<string | null>(null);
  const [selectedManagerForView, setSelectedManagerForView] = useState<EmployeeType | null>(null);
  const [selectedManagerPhotoOpen, setSelectedManagerPhotoOpen] = useState(false);
  const [selectedEmployeePhotoItems, setSelectedEmployeePhotoItems] = useState<Array<{ file_url: string; file_name?: string; creation?: string; name?: string }>>([]);
  const [loadingSelectedEmployeePhotos, setLoadingSelectedEmployeePhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  
  const titleStorageKey = useCallback((section: "team" | "manager") => {
    const userKey = employee?.name ? String(employee.name) : "anonymous";
    return `profile.sectionTitle.${section}.${userKey}`;
  }, [employee?.name]);

  // Load custom titles from localStorage (per employee on this device/browser)
  useEffect(() => {
    if (!employee?.name) return;
    try {
      const storedTeam = localStorage.getItem(titleStorageKey("team"));
      const storedManager = localStorage.getItem(titleStorageKey("manager"));
      setTeamTitle((storedTeam && storedTeam.trim()) ? storedTeam.trim() : DEFAULT_TEAM_TITLE);
      setManagerSectionTitle((storedManager && storedManager.trim()) ? storedManager.trim() : DEFAULT_MANAGER_TITLE);
    } catch {
      // ignore storage errors
      setTeamTitle(DEFAULT_TEAM_TITLE);
      setManagerSectionTitle(DEFAULT_MANAGER_TITLE);
    }
  }, [employee?.name, titleStorageKey]);

  // Load titles + sync settings from Frappe user settings (sync across devices). LocalStorage remains as fallback.
  useEffect(() => {
    let cancelled = false;
    if (!employee?.name) return;

    (async () => {
      const settings = userSettings ?? await internalApiClient.getUserSettings();
      if (cancelled) return;

      const { mode, saveVariant } = pickVariantForSave(settings);
      remoteMetaRef.current = { mode, saveVariant };

      const blobs = Array.isArray(settings?.blobs) ? settings!.blobs! : [];

      // 1) Profile titles are always shared (synced across all clients)
      const titlesBlob = blobs.find((b: any) => String(b?.scope || '') === 'profile.titles' && String(b?.variant || '') === 'shared');
      const titlesRaw = titlesBlob?.payload_json != null ? String(titlesBlob.payload_json) : '';
      if (titlesRaw) {
        try {
          const parsed = JSON.parse(titlesRaw) as { teamTitle?: string; managerTitle?: string };
          const nextTeam = (parsed?.teamTitle && String(parsed.teamTitle).trim()) ? String(parsed.teamTitle).trim() : DEFAULT_TEAM_TITLE;
          const nextManager = (parsed?.managerTitle && String(parsed.managerTitle).trim()) ? String(parsed.managerTitle).trim() : DEFAULT_MANAGER_TITLE;
          setTeamTitle(nextTeam);
          setManagerSectionTitle(nextManager);
        } catch {
          // ignore parse errors
        }
      }
    })().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [employee?.name, pickVariantForSave, userSettings]);

  const openEditTitle = useCallback((section: "team" | "manager") => {
    setEditSection(section);
    setEditDraft(section === "team" ? teamTitle : managerSectionTitle);
  }, [teamTitle, managerSectionTitle]);

  const saveEditTitle = useCallback((section: "team" | "manager") => {
    const next = editDraft.trim();
    const value = next || (section === "team" ? DEFAULT_TEAM_TITLE : DEFAULT_MANAGER_TITLE);
    const nextTeam = section === "team" ? value : teamTitle;
    const nextManager = section === "manager" ? value : managerSectionTitle;
    if (section === "team") setTeamTitle(value);
    if (section === "manager") setManagerSectionTitle(value);
    try {
      localStorage.setItem(titleStorageKey(section), value);
    } catch {
      // ignore storage errors
    }
    // Save to Frappe (always shared)
    try {
      const lastClient = detectClientVariant();
      void internalApiClient.upsertUserSettings({
        active_variant_mode: remoteMetaRef.current.mode,
        last_client: lastClient,
        blobs: [{
          scope: 'profile.titles',
          variant: 'shared' as any,
          payload_version: 1,
          payload_json: JSON.stringify({ teamTitle: nextTeam, managerTitle: nextManager }),
        }]
      }).finally(() => reloadUserSettings());
    } catch {
      // ignore
    }
    setEditSection(null);
  }, [DEFAULT_MANAGER_TITLE, DEFAULT_TEAM_TITLE, detectClientVariant, editDraft, managerSectionTitle, teamTitle, titleStorageKey]);

  const cancelEditTitle = useCallback(() => {
    setEditSection(null);
    setEditDraft("");
  }, []);


  const loadManager = useCallback(async () => {
    if (!employee?.reports_to) {
      return;
    }
    setLoadingManager(true);
    setError(null);
    try {
      const managerData = await internalApiClient.getManagerByEmployeeId(employee.reports_to);
      setManager(managerData);
    } catch (err) {
      setError("Не удалось загрузить данные руководителя.");
      logger.error("❌ Ошибка загрузки руководителя:", err);
    } finally {
      setLoadingManager(false);
    }
  }, [employee?.reports_to]);

  const handleLogout = useCallback(async () => {
    await internalApiClient.logout();
    window.location.reload();
  }, []);

  useEffect(() => {
    loadManager();
  }, [loadManager]);

  // Load managers list for current department (like in tasks/selector)
  useEffect(() => {
    const load = async () => {
      if (!employee?.department) return;
      try {
        setLoadingManagersList(true);
        setManagersListError(null);
        const list = await internalApiClient.getEmployeesByDepartment(employee.department, 300);
        const currentId = employee?.name ? String(employee.name) : '';
        const bossId = employee?.reports_to ? String(employee.reports_to) : '';
        // "Менеджеры" — всё, где должность содержит "менеджер"
        const managersOnly = (list || []).filter((emp) => {
          const d = String(emp.designation || '').toLowerCase();
          if (!d.includes('менеджер')) return false;
          const id = emp?.name ? String(emp.name) : '';
          if (currentId && id === currentId) return false;
          if (bossId && id === bossId) return false;
          return true;
        });
        setManagersList(managersOnly);
      } catch (e) {
        logger.error("❌ Ошибка загрузки списка менеджеров:", e);
        setManagersList([]);
        setManagersListError("Не удалось загрузить список менеджеров");
      } finally {
        setLoadingManagersList(false);
      }
    };
    load();
  }, [employee?.department, employee?.name, employee?.reports_to]);

  const handlePickPhoto = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleTakePhoto = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  const handlePhotoChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // allow re-selecting same file later
    e.target.value = '';

    if (!file) return;

    try {
      setUploadingPhoto(true);
      const resp = await internalApiClient.uploadProfilePhoto(file);
      if (resp?.ok) {
        toast({ title: "Фото профиля обновлено" });
        setAvatarVersion((v) => v + 1);
        reloadEmployee();
      } else {
        toast({ title: "Не удалось загрузить фото", description: "Попробуй ещё раз", variant: "destructive" });
      }
    } catch (err) {
      logger.error("❌ Ошибка загрузки фото профиля:", err);
      toast({ title: "Ошибка загрузки фото", description: "Попробуй ещё раз", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
    }
  }, [reloadEmployee]);

  const base = ((import.meta.env?.VITE_FRAPPE_BASE_URL as string | undefined) || 'https://loovtest.erpnext.com').replace(/\/$/, '');
  const toFullUrl = useCallback((rawValue: string) => {
    const raw = rawValue ? String(rawValue).trim() : '';
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw) || /^data:/i.test(raw)) return encodeURI(raw);
    const normalizedPath = raw.startsWith('/') ? raw : `/${raw}`;
    return encodeURI(`${base}${normalizedPath}`);
  }, [base]);

  // Use same-origin proxy for iOS Telegram WebView reliability
  const fullPhotoUrl = employee?.image ? `/api/profile/photo/image` : '';

  const withCacheBust = useCallback((url: string, v?: string) => {
    const clean = url ? String(url) : '';
    if (!clean) return '';
    const key = v ? String(v) : '';
    if (!key) return clean;
    const sep = clean.includes('?') ? '&' : '?';
    return `${clean}${sep}v=${encodeURIComponent(key)}`;
  }, []);

  // Load photo history when opening viewer
  useEffect(() => {
    const load = async () => {
      if (!viewPhotoOpen) return;
      setLoadingPhotoItems(true);
      try {
        const resp = await internalApiClient.getProfilePhotos();
        const items = Array.isArray(resp?.items) ? resp!.items! : [];
        setPhotoItems(items);
      } catch (e) {
        logger.error("❌ Ошибка загрузки истории фото профиля:", e);
        setPhotoItems([]);
      } finally {
        setLoadingPhotoItems(false);
      }
    };
    load();
  }, [viewPhotoOpen]);

  const galleryImages = (() => {
    const urls = (photoItems || [])
      .map((it) => it?.name ? withCacheBust(`/api/profile/photos/file/${encodeURIComponent(it.name)}`, it.name) : '')
      .filter(Boolean);
    // If history is empty, fallback to current avatar proxy
    if (urls.length === 0 && fullPhotoUrl) {
      return [withCacheBust(fullPhotoUrl, String(avatarVersion || Date.now()))];
    }
    return urls;
  })();

  const initialGalleryIndex = 0;

  const handleDeletePhoto = useCallback(async () => {
    if (!employee?.image) return;

    try {
      setDeletingPhoto(true);
      const resp = await internalApiClient.deleteProfilePhoto();
      if (resp?.ok) {
        toast({ title: "Фото удалено" });
        setDeleteConfirmOpen(false);
        setAvatarVersion((v) => v + 1);
        reloadEmployee();
      } else {
        toast({ title: "Не удалось удалить фото", description: "Попробуй ещё раз", variant: "destructive" });
      }
    } catch (err) {
      logger.error("❌ Ошибка удаления фото профиля:", err);
      toast({ title: "Ошибка удаления фото", description: "Попробуй ещё раз", variant: "destructive" });
    } finally {
      setDeletingPhoto(false);
    }
  }, [employee?.image, reloadEmployee]);

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="md" colorClass="text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  const {
    employee_name,
    designation,
    department,
    custom_tg_username,
  } = employee;

  const managerEmployeeId = employee?.reports_to || '';
  const managerImageUrl = managerEmployeeId
    ? withCacheBust(`/api/frappe/employees/${encodeURIComponent(managerEmployeeId)}/image`, String(managerPhotoVersion || Date.now()))
    : '';

  // Load manager photo history lazily when opening their viewer
  useEffect(() => {
    const load = async () => {
      if (!managerPhotoOpen || !managerEmployeeId) return;
      setLoadingManagerPhotos(true);
      try {
        const resp = await internalApiClient.getEmployeeProfilePhotos(managerEmployeeId);
        setManagerPhotoItems(Array.isArray(resp?.items) ? resp!.items! : []);
      } catch (e) {
        logger.error('❌ Ошибка загрузки истории фото руководителя:', e);
        setManagerPhotoItems([]);
      } finally {
        setLoadingManagerPhotos(false);
      }
    };
    load();
  }, [managerPhotoOpen, managerEmployeeId]);

  // Load selected employee photo history lazily when opening their viewer
  useEffect(() => {
    const load = async () => {
      const empId = selectedManagerForView?.name ? String(selectedManagerForView.name) : '';
      if (!selectedManagerPhotoOpen || !empId) return;
      setLoadingSelectedEmployeePhotos(true);
      try {
        const resp = await internalApiClient.getEmployeeProfilePhotos(empId);
        setSelectedEmployeePhotoItems(Array.isArray(resp?.items) ? resp!.items! : []);
      } catch (e) {
        logger.error('❌ Ошибка загрузки истории фото сотрудника:', e);
        setSelectedEmployeePhotoItems([]);
      } finally {
        setLoadingSelectedEmployeePhotos(false);
      }
    };
    load();
  }, [selectedManagerPhotoOpen, selectedManagerForView?.name]);

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      {/* Header */}
      <PageHeader title="Мой профиль" subtitle="Твои личные данные и настройки" />

      {/* Profile Card */}
      <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <CardContent className="p-6 flex flex-col items-center text-center">
          <div className="relative mb-4">
            <button
              type="button"
              className="rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400/50"
              onClick={() => {
                if (employee.image && fullPhotoUrl) {
                  setViewPhotoOpen(true);
                } else {
                  // if no photo yet, default to picking from files
                  handlePickPhoto();
                }
              }}
              aria-label={employee.image ? "Посмотреть фото профиля" : "Загрузить фото профиля"}
            >
              <EmployeeAvatar 
                name={employee_name}
                image={withCacheBust(fullPhotoUrl || employee.image || '', String(avatarVersion))}
                size="lg"
                fallbackColor="blue"
                className="w-24 h-24 border-4 border-white dark:border-gray-700 shadow-md"
              />
            </button>

            {/* Camera icon opens menu (edit actions) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Изменить фото профиля"
                  className="absolute -bottom-1 -right-1 rounded-full border border-black/10 dark:border-white/10 bg-white/90 dark:bg-black/60 text-gray-800 dark:text-gray-100 shadow-md p-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Camera size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={handleTakePhoto} disabled={uploadingPhoto || deletingPhoto}>
                  <Camera size={16} className="mr-2" />
                  Сфоткать
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handlePickPhoto} disabled={uploadingPhoto || deletingPhoto}>
                  <Upload size={16} className="mr-2" />
                  Выбрать из файлов
                </DropdownMenuItem>
                {employee.image ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => setDeleteConfirmOpen(true)}
                      disabled={uploadingPhoto || deletingPhoto}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 size={16} className="mr-2" />
                      Удалить фото
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={handlePhotoChange}
          />
          
          {employee.image && fullPhotoUrl ? (
            <ProfilePhotoGalleryModal
              open={viewPhotoOpen}
              onOpenChange={setViewPhotoOpen}
              images={galleryImages.length ? galleryImages : [fullPhotoUrl]}
              initialIndex={initialGalleryIndex}
              alt={employee_name}
            />
          ) : null}

          <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить фото профиля?</AlertDialogTitle>
                <AlertDialogDescription>
                  Фото будет удалено из профиля сотрудника во Frappe. Это действие можно отменить, просто загрузив новое фото.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deletingPhoto}>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeletePhoto}
                  disabled={deletingPhoto}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deletingPhoto ? "Удаляем..." : "Удалить"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{employee_name}</h1>
          <p className="text-blue-600 dark:text-blue-400 font-semibold">{designation}</p>
          {department && (
             <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mt-2">
                <Building size={14} />
                <span>{department}</span>
             </div>
          )}
          {custom_tg_username && (
             <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">@{custom_tg_username}</p>
          )}
        </CardContent>
      </Card>

      {/* Зеленая кнопка и форма временно скрыты */}
      <Button
        onClick={() => setGreenOpen(true)}
        className="w-full h-12 text-white font-semibold bg-gradient-to-r from-emerald-500 via-green-500 to-lime-500 shadow-lg hover:shadow-xl"
      >
        Зелёная кнопка
      </Button>

      <GreenFeedbackModal open={greenOpen} onClose={() => setGreenOpen(false)} />

      {/* Schedule Widget */}
      {employee?.name && <ProfileCalendarWidget employeeId={employee.name} branchId={storeId} />}

      {/* Manager Card */}
      <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center justify-between text-gray-800 dark:text-gray-200">
            <span className="flex items-center gap-2">
              <Crown size={20} className="text-amber-500" />
              {editSection === "manager" ? (
                <span className="flex items-center gap-2">
                  <Input
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEditTitle("manager");
                      if (e.key === "Escape") cancelEditTitle();
                    }}
                    autoFocus
                    maxLength={40}
                    className="h-7 w-[180px] sm:w-[240px] text-sm px-2 border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-900/50"
                  />
                  <button
                    type="button"
                    onClick={() => saveEditTitle("manager")}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                    aria-label="Сохранить"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditTitle}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                    aria-label="Отмена"
                  >
                    <X size={18} />
                  </button>
                </span>
              ) : (
                managerSectionTitle
              )}
            </span>
            {editSection !== "manager" ? (
              <button
                type="button"
                onClick={() => openEditTitle("manager")}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                aria-label="Переименовать раздел руководителя"
              >
                <Pencil size={16} />
              </button>
            ) : (
              <span />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingManager ? (
            <div className="flex items-center justify-center p-4">
              <Spinner size="sm" colorClass="text-blue-600 dark:text-blue-400" />
            </div>
          ) : error ? (
            <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
          ) : manager ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setManagerPhotoVersion(Date.now());
                  setManagerPhotoOpen(true);
                }}
                className="rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                aria-label="Посмотреть фото руководителя"
              >
                <EmployeeAvatar 
                  name={manager.employee_name}
                  // use proxy endpoint for reliability on mobile
                  image={managerEmployeeId ? managerImageUrl : (manager.image || '')}
                  size="md"
                  fallbackColor="gray"
                  className="w-16 h-16"
                />
              </button>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{manager.employee_name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{manager.designation}</p>
                {manager.custom_tg_username && (
                  <p className="text-sm text-blue-500 dark:text-blue-400 mt-1">@{manager.custom_tg_username}</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">Руководитель не назначен</p>
          )}
        </CardContent>
      </Card>

      {managerEmployeeId && (
        <ProfilePhotoGalleryModal
          open={managerPhotoOpen}
          onOpenChange={setManagerPhotoOpen}
          images={
            (() => {
              const urls = (managerPhotoItems || [])
                .map((it) => it?.name ? withCacheBust(`/api/profile/photos/file/${encodeURIComponent(it.name)}`, it.name) : '')
                .filter(Boolean);
              if (urls.length === 0) {
                urls.push(managerImageUrl);
              }
              return urls.filter(Boolean);
            })()
          }
          initialIndex={0}
          alt={manager?.employee_name || 'Руководитель'}
        />
      )}

      {/* Managers list */}
      <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center justify-between text-gray-800 dark:text-gray-200">
            <span className="flex items-center gap-2">
              <User size={20} className="text-blue-500" />
              {editSection === "team" ? (
                <span className="flex items-center gap-2">
                  <Input
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEditTitle("team");
                      if (e.key === "Escape") cancelEditTitle();
                    }}
                    autoFocus
                    maxLength={40}
                    className="h-7 w-[180px] sm:w-[240px] text-sm px-2 border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-900/50"
                  />
                  <button
                    type="button"
                    onClick={() => saveEditTitle("team")}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                    aria-label="Сохранить"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditTitle}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                    aria-label="Отмена"
                  >
                    <X size={18} />
                  </button>
                </span>
              ) : (
                teamTitle
              )}
            </span>
            {editSection !== "team" ? (
              <button
                type="button"
                onClick={() => openEditTitle("team")}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                aria-label="Переименовать раздел команды"
              >
                <Pencil size={16} />
              </button>
            ) : (
              <span />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingManagersList ? (
            <div className="flex items-center justify-center p-4">
              <Spinner size="sm" colorClass="text-blue-600 dark:text-blue-400" />
            </div>
          ) : managersListError ? (
            <p className="text-red-500 dark:text-red-400 text-sm">{managersListError}</p>
          ) : managersList.length > 0 ? (
            <div className="space-y-3">
              {managersList.map((m) => {
                const id = m?.name ? String(m.name) : '';
                const proxyUrl = id ? withCacheBust(`/api/frappe/employees/${encodeURIComponent(id)}/image`, id) : '';
                return (
                  <div key={id || m.employee_name} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedManagerForView(m);
                        setSelectedManagerPhotoOpen(true);
                      }}
                      className="rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                      aria-label="Посмотреть фото менеджера"
                    >
                      <EmployeeAvatar
                        name={m.employee_name}
                        image={proxyUrl || m.image}
                        size="md"
                        fallbackColor="blue"
                        className="w-14 h-14"
                      />
                    </button>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">{m.employee_name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{m.designation}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">Менеджеры не найдены</p>
          )}
        </CardContent>
      </Card>

      {selectedManagerForView?.name ? (
        <ProfilePhotoGalleryModal
          open={selectedManagerPhotoOpen}
          onOpenChange={setSelectedManagerPhotoOpen}
          images={
            (() => {
              const empId = String(selectedManagerForView.name);
              const urls = (selectedEmployeePhotoItems || [])
                .map((it) => it?.name ? withCacheBust(`/api/profile/photos/file/${encodeURIComponent(it.name)}`, it.name) : '')
                .filter(Boolean);
              // fallback to current avatar proxy for that employee if history is empty or still loading
              if (urls.length === 0) {
                urls.push(withCacheBust(`/api/frappe/employees/${encodeURIComponent(empId)}/image`, String(Date.now())));
              }
              return urls;
            })()
          }
          initialIndex={0}
          alt={selectedManagerForView.employee_name}
        />
      ) : null}

      {/* Reload Button */}
      <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="w-full flex items-center justify-center gap-2 bg-white border-gray-300 text-gray-700 hover:bg-gray-100 text-sm px-4 py-2 rounded-md"
          >
            <RefreshCw size={16} />
            Перезагрузить аккаунт
          </Button>
          <CommitInfo />
        </CardContent>
      </Card>

    </div>
  );
};

// Компонент для отображения информации о коммите
const CommitInfo = () => {
  const { shortHash } = useVersion();

  if (!shortHash || shortHash === "unknown") {
    return null;
  }

  return (
    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 text-right">
      <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
        Версия: {shortHash}
      </p>
    </div>
  );
};
