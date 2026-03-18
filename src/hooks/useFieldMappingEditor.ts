import { useState, useMemo, useCallback, useEffect } from 'react';
import { getAllBranchesWithStoreIds } from '@/data/branchStoreMapping';
import { useEmployee } from '@/contexts/EmployeeProvider';
import { internalApiClient } from '@/lib/internalApiClient';
import type { FieldMapping, FieldMappingEntityType, MetricBinding } from '@/lib/internalApiClient';

// ─── Types ───

export interface EmployeeOption {
  name: string;
  employee_name: string;
  custom_itigris_user_id?: string;
  department?: string;
}

export interface DepartmentOption {
  name: string;
  department_name: string;
  custom_store_id?: string;
  parent_department?: string;
}

export interface DesignationOption {
  name: string;
}

export interface MergedMapping {
  mapping: FieldMapping;
  isInherited: boolean;
  overrideValues: Record<string, string>;
}

export interface UseFieldMappingEditorOptions {
  /** Whether the editor is active (loads data when true) */
  active: boolean;
  /** Data source ID for loading global/inherited mappings */
  dataSourceId: string | null;
  /** Metric source type — only 'external_api' has mappings */
  source: string;
  /** Initial per-metric fieldMappings */
  initialFieldMappings: FieldMapping[];
}

// ─── Hook ───

export function useFieldMappingEditor({
  active,
  dataSourceId,
  source,
  initialFieldMappings,
}: UseFieldMappingEditorOptions) {
  const { storeOptions } = useEmployee();
  const isExternalApi = source === 'external_api';

  // ─── Branches ───
  const branches = useMemo(() => {
    const branchesWithIds = getAllBranchesWithStoreIds();
    return branchesWithIds.map(b => {
      const store = storeOptions.find(s => s.store_id === b.storeId);
      return { slug: b.slug, storeId: b.storeId, name: store?.name || b.name };
    });
  }, [storeOptions]);

  // ─── Source (global) fieldMappings ───
  const [sourceFieldMappings, setSourceFieldMappings] = useState<FieldMapping[]>([]);
  const [sourceLabel, setSourceLabel] = useState('');

  // ─── Per-metric fieldMappings (overrides) ───
  const [metricOverrides, setMetricOverrides] = useState<FieldMapping[]>(
    () => initialFieldMappings.map(fm => ({ ...fm, values: { ...fm.values } }))
  );

  // ─── Entity data ───
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [designations, setDesignations] = useState<DesignationOption[]>([]);
  const [loadingDesignations, setLoadingDesignations] = useState(false);

  // ─── Reset overrides when re-activated or dataSourceId changes ───
  useEffect(() => {
    if (active && isExternalApi) {
      setMetricOverrides(initialFieldMappings.map(fm => ({ ...fm, values: { ...fm.values } })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initialFieldMappings is stable from props, only reset on active/dataSourceId change
  }, [active, isExternalApi, dataSourceId]);

  // ─── Load data when active ───
  useEffect(() => {
    if (!active || !isExternalApi) return;

    // Load data source fieldMappings
    if (dataSourceId) {
      internalApiClient.getDataSources()
        .then(res => {
          const src = res.sources.find(s => s.id === dataSourceId);
          if (src) {
            setSourceFieldMappings(src.fieldMappings || []);
            setSourceLabel(src.label || src.id);
          }
        })
        .catch(() => {});
    }

    // Load employees
    if (employees.length === 0) {
      setLoadingEmployees(true);
      internalApiClient.getEmployeesWithExternalIds()
        .then(data => setEmployees(data))
        .finally(() => setLoadingEmployees(false));
    }

    // Load departments
    if (departments.length === 0) {
      setLoadingDepartments(true);
      internalApiClient.getDepartments()
        .then(data => setDepartments(data))
        .finally(() => setLoadingDepartments(false));
    }

    // Load designations
    if (designations.length === 0) {
      setLoadingDesignations(true);
      internalApiClient.getDesignations()
        .then(data => setDesignations(data))
        .finally(() => setLoadingDesignations(false));
    }
  }, [active, isExternalApi, dataSourceId]);

  // ─── Merged view: global + per-metric ───
  const mergedMappings = useMemo<MergedMapping[]>(() => {
    const result: MergedMapping[] = [];

    // Start with source mappings
    for (const sfm of sourceFieldMappings) {
      const override = metricOverrides.find(
        o => o.apiField === sfm.apiField && o.entityType === sfm.entityType
      );
      result.push({
        mapping: sfm,
        isInherited: true,
        overrideValues: override?.values || {},
      });
    }

    // Add metric-only mappings (not present in source)
    for (const mfm of metricOverrides) {
      const inSource = sourceFieldMappings.find(
        s => s.apiField === mfm.apiField && s.entityType === mfm.entityType
      );
      if (!inSource) {
        result.push({
          mapping: mfm,
          isInherited: false,
          overrideValues: mfm.values,
        });
      }
    }

    return result;
  }, [sourceFieldMappings, metricOverrides]);

  // ─── Override helpers ───

  const setOverrideValue = useCallback((apiField: string, entityType: string, entityId: string, value: string) => {
    setMetricOverrides(prev => {
      const existing = prev.find(o => o.apiField === apiField && o.entityType === entityType);
      if (existing) {
        return prev.map(o => {
          if (o.apiField !== apiField || o.entityType !== entityType) return o;
          const values = { ...o.values };
          if (value) {
            values[entityId] = value;
          } else {
            delete values[entityId];
          }
          return { ...o, values };
        });
      } else {
        const id = apiField.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 32) + '_' + Date.now().toString(36);
        return [...prev, {
          id,
          apiField,
          entityType: entityType as FieldMappingEntityType,
          label: apiField,
          values: { [entityId]: value },
        }];
      }
    });
  }, []);

  const clearOverrideValue = useCallback((apiField: string, entityType: string, entityId: string) => {
    setMetricOverrides(prev => {
      return prev.map(o => {
        if (o.apiField !== apiField || o.entityType !== entityType) return o;
        const values = { ...o.values };
        delete values[entityId];
        return { ...o, values };
      }).filter(o => Object.keys(o.values).length > 0);
    });
  }, []);

  const addOverrideMapping = useCallback((apiField: string, entityType: FieldMappingEntityType, label: string) => {
    const id = apiField.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 32) + '_' + Date.now().toString(36);
    setMetricOverrides(prev => [...prev, {
      id,
      apiField,
      entityType,
      label: label || apiField,
      values: {},
    }]);
  }, []);

  const removeOverrideMapping = useCallback((apiField: string, entityType: string) => {
    setMetricOverrides(prev => prev.filter(o => !(o.apiField === apiField && o.entityType === entityType)));
  }, []);

  const addEmployeeToOverride = useCallback((apiField: string, entityType: string, employeeId: string) => {
    const emp = employees.find(e => e.name === employeeId);
    const defaultValue = emp?.custom_itigris_user_id || '';
    setOverrideValue(apiField, entityType, employeeId, defaultValue);
  }, [employees, setOverrideValue]);

  // ─── Stats ───

  const countMappedByType = useCallback((type: FieldMappingEntityType) =>
    new Set(
      mergedMappings
        .filter(m => m.mapping.entityType === type)
        .flatMap(m => {
          const effective = { ...m.mapping.values, ...m.overrideValues };
          return Object.entries(effective).filter(([, v]) => v).map(([k]) => k);
        })
    ).size,
  [mergedMappings]);

  // ─── Save helpers ───

  const getCleanOverrides = useCallback((): FieldMapping[] => {
    return metricOverrides
      .map(fm => ({
        ...fm,
        values: Object.fromEntries(
          Object.entries(fm.values).filter(([, v]) => v)
        ),
      }))
      .filter(fm => Object.keys(fm.values).length > 0);
  }, [metricOverrides]);

  const deriveBindingsFromMappings = useCallback((): MetricBinding[] => {
    const bindings: MetricBinding[] = [];

    for (const { mapping, overrideValues } of mergedMappings) {
      if (mapping.entityType === 'branch') {
        const effectiveValues = { ...mapping.values, ...overrideValues };
        for (const [id, val] of Object.entries(effectiveValues)) {
          if (val) bindings.push({ scope: 'branch', scopeId: id, enabled: true });
        }
      }
      if (mapping.entityType === 'employee') {
        const effectiveValues = { ...mapping.values, ...overrideValues };
        for (const [id, val] of Object.entries(effectiveValues)) {
          if (val) bindings.push({ scope: 'employee', scopeId: id, enabled: true });
        }
      }
      // department, designation, custom — no auto-bindings needed
    }

    // Deduplicate
    const seen = new Set<string>();
    return bindings.filter(b => {
      const key = `${b.scope}:${b.scopeId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [mergedMappings]);

  return {
    // Data
    sourceFieldMappings,
    sourceLabel,
    metricOverrides,
    mergedMappings,

    // Entity data
    branches,
    employees,
    loadingEmployees,
    departments,
    loadingDepartments,
    designations,
    loadingDesignations,

    // Override mutation callbacks
    setOverrideValue,
    clearOverrideValue,
    addOverrideMapping,
    removeOverrideMapping,
    addEmployeeToOverride,

    // Stats
    countMappedByType,

    // Save helpers
    getCleanOverrides,
    deriveBindingsFromMappings,
  };
}
