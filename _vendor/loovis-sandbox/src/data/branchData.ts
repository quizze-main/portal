export const BRANCHES = [
  { id: 'moscow_club', name: 'Москва клуб' },
  { id: 'spb_clinic', name: 'Санкт-Петербург клиника' },
  { id: 'kaliningrad_club', name: 'Калининград клуб' },
  { id: 'kaliningrad_clinic', name: 'Калининград клиника' },
  { id: 'yakutsk_club', name: 'Якутск клуб' },
  { id: 'yakutsk_clinic', name: 'Якутск клиника' },
  { id: 'kazan_club', name: 'Казань клуб' },
] as const;

export type BranchId = typeof BRANCHES[number]['id'];

export const POSITIONS = [
  { id: 'senior_manager', name: 'Старший менеджер заботы', branches: 'all' as const },
  { id: 'manager', name: 'Менеджер заботы', branches: 'all' as const },
  { id: 'optometrist', name: 'Оптометрист', branches: 'all' as const },
  // Москва клуб — 3 эксклюзивные должности
  { id: 'senior_manager', name: 'Старший менеджер заботы', branches: ['moscow_club'] as const },
  { id: 'manager', name: 'Менеджер заботы', branches: ['moscow_club'] as const },
  { id: 'optometrist', name: 'Оптометрист', branches: ['moscow_club'] as const },
  // Калининград клуб — 4 эксклюзивные должности
  { id: 'senior_manager', name: 'Старший менеджер', branches: ['kaliningrad_club'] as const },
  { id: 'manager_5_2', name: 'Менеджер 5/2', branches: ['kaliningrad_club'] as const },
  { id: 'manager_2_2', name: 'Менеджер 2/2', branches: ['kaliningrad_club'] as const },
  { id: 'optometrist', name: 'Оптометрист', branches: ['kaliningrad_club'] as const },
  // Другие филиалы
  { id: 'universal_manager', name: 'Менеджер-универсал', branches: ['kazan_club'] as const },
  { id: 'manager', name: 'Менеджер заботы', branches: ['spb_clinic'] as const },
  { id: 'manager', name: 'Менеджер заботы', branches: ['kaliningrad_clinic'] as const },
  { id: 'optometrist', name: 'Оптометрист', branches: ['kaliningrad_clinic'] as const },
  { id: 'manager', name: 'Менеджер заботы', branches: ['yakutsk_club'] as const },
  { id: 'manager', name: 'Менеджер заботы', branches: ['yakutsk_clinic'] as const },
  { id: 'senior_manager', name: 'Старший менеджер', branches: ['yakutsk_club'] as const },
  { id: 'senior_manager', name: 'Старший менеджер', branches: ['yakutsk_clinic'] as const },
];

export function getBranchName(branchId: string): string | undefined {
  return BRANCHES.find(b => b.id === branchId)?.name;
}

export function getAvailablePositions(branchId: string) {
  const exclusivePositions = POSITIONS.filter(pos => 
    Array.isArray(pos.branches) && pos.branches.includes(branchId as any)
  );
  
  return exclusivePositions.length > 0 
    ? exclusivePositions 
    : POSITIONS.filter(pos => pos.branches === 'all');
}

// ===== СОТРУДНИКИ ФИЛИАЛОВ =====

export interface BranchEmployee {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  branchId: string;
}

export const BRANCH_EMPLOYEES: Record<string, BranchEmployee[]> = {
  moscow_club: [
    { id: 'elena_novikova', name: 'Елена Новикова', role: 'Старший менеджер заботы', branchId: 'moscow_club' },
    { id: 'anna_petrova', name: 'Анна Петрова', role: 'Менеджер заботы', branchId: 'moscow_club' },
    { id: 'dmitry_volkov', name: 'Дмитрий Волков', role: 'Менеджер заботы', branchId: 'moscow_club' },
    { id: 'ivan_sidorov', name: 'Иван Сидоров', role: 'Оптометрист', branchId: 'moscow_club' },
    { id: 'maria_kozlova', name: 'Мария Козлова', role: 'Менеджер заботы', branchId: 'moscow_club' },
  ],
  spb_clinic: [
    { id: 'olga_smirnova', name: 'Ольга Смирнова', role: 'Старший менеджер заботы', branchId: 'spb_clinic' },
    { id: 'andrey_kuznetsov', name: 'Андрей Кузнецов', role: 'Менеджер заботы', branchId: 'spb_clinic' },
    { id: 'tatiana_lebedeva', name: 'Татьяна Лебедева', role: 'Оптометрист', branchId: 'spb_clinic' },
    { id: 'sergey_pavlov', name: 'Сергей Павлов', role: 'Менеджер заботы', branchId: 'spb_clinic' },
  ],
  kaliningrad_club: [
    { id: 'natalia_belova', name: 'Наталья Белова', role: 'Старший менеджер', branchId: 'kaliningrad_club' },
    { id: 'viktor_orlov', name: 'Виктор Орлов', role: 'Менеджер 5/2', branchId: 'kaliningrad_club' },
    { id: 'ekaterina_morozova', name: 'Екатерина Морозова', role: 'Менеджер 2/2', branchId: 'kaliningrad_club' },
    { id: 'alexey_sokolov', name: 'Алексей Соколов', role: 'Оптометрист', branchId: 'kaliningrad_club' },
  ],
  kaliningrad_clinic: [
    { id: 'marina_volkova', name: 'Марина Волкова', role: 'Менеджер заботы', branchId: 'kaliningrad_clinic' },
    { id: 'pavel_grigoriev', name: 'Павел Григорьев', role: 'Менеджер заботы', branchId: 'kaliningrad_clinic' },
    { id: 'yulia_fedorova', name: 'Юлия Фёдорова', role: 'Оптометрист', branchId: 'kaliningrad_clinic' },
  ],
  yakutsk_club: [
    { id: 'svetlana_tikhonova', name: 'Светлана Тихонова', role: 'Старший менеджер', branchId: 'yakutsk_club' },
    { id: 'mikhail_popov', name: 'Михаил Попов', role: 'Менеджер заботы', branchId: 'yakutsk_club' },
    { id: 'irina_makarova', name: 'Ирина Макарова', role: 'Менеджер заботы', branchId: 'yakutsk_club' },
    { id: 'nikolay_vasiliev', name: 'Николай Васильев', role: 'Оптометрист', branchId: 'yakutsk_club' },
  ],
  yakutsk_clinic: [
    { id: 'artem_egorov', name: 'Артём Егоров', role: 'Старший менеджер', branchId: 'yakutsk_clinic' },
    { id: 'ksenia_romanova', name: 'Ксения Романова', role: 'Менеджер заботы', branchId: 'yakutsk_clinic' },
    { id: 'denis_zakharov', name: 'Денис Захаров', role: 'Оптометрист', branchId: 'yakutsk_clinic' },
  ],
  kazan_club: [
    { id: 'oksana_koroleva', name: 'Оксана Королёва', role: 'Менеджер-универсал', branchId: 'kazan_club' },
    { id: 'vladimir_stepanov', name: 'Владимир Степанов', role: 'Менеджер-универсал', branchId: 'kazan_club' },
    { id: 'anastasia_nikitina', name: 'Анастасия Никитина', role: 'Менеджер-универсал', branchId: 'kazan_club' },
  ],
};

// Получить сотрудников филиала
export function getBranchEmployees(branchId: string): BranchEmployee[] {
  return BRANCH_EMPLOYEES[branchId] || [];
}

// Получить всех сотрудников всех филиалов
export function getAllEmployees(): BranchEmployee[] {
  return Object.values(BRANCH_EMPLOYEES).flat();
}

// Получить сотрудника по ID
export function getEmployeeById(employeeId: string): BranchEmployee | undefined {
  return getAllEmployees().find(e => e.id === employeeId);
}

// Получить филиал сотрудника
export function getEmployeeBranch(employeeId: string): string | undefined {
  const employee = getEmployeeById(employeeId);
  return employee?.branchId;
}
