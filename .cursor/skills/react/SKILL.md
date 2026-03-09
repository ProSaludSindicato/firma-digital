---
name: react
description: Modern React 18 with hooks, functional components, and TypeScript. Use when creating components, implementing hooks, managing state, optimizing renders, or working with React, JSX, useState, useEffect, Context, or Vite + React projects.
---

# React (definitiva)

Guía para proyectos React 18 con componentes funcionales, hooks y TypeScript. Compatible con Vite, Radix UI y patrones actuales.

## Principios

- **Solo componentes funcionales** — sin class components.
- **Hooks para estado y efectos** — `useState`, `useReducer`, `useEffect`, y custom hooks.
- **TypeScript** — tipar props, estado y eventos; evitar `any`.
- **Composición** — componentes pequeños y reutilizables; composición sobre herencia.

## Componentes y props

```tsx
// Props tipadas con interface
interface ButtonProps {
  label: string;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
  children?: React.ReactNode;
}

export function Button({ label, variant = 'primary', onClick, children }: ButtonProps) {
  return (
    <button type="button" className={variant} onClick={onClick}>
      {children ?? label}
    </button>
  );
}
```

- Usar `React.ReactNode` para hijos flexibles; `React.ReactElement` si solo aceptas elementos.
- Destructurar props y definir valores por defecto en la firma.
- Para componentes que solo envuelven hijos: `interface Props { children: React.ReactNode }`.

## Estado local

- **useState** para estado simple (boolean, string, número, objeto/array).
- **useReducer** cuando hay transiciones de estado complejas o lógica condicional múltiple.

```tsx
const [value, setValue] = useState<string>('');
const [open, setOpen] = useState(false);

// Actualizaciones que dependen del valor anterior
setCount((prev) => prev + 1);
setItems((prev) => [...prev, newItem]);
```

- No mutar estado; devolver nuevos objetos/arrays (spread, filter, map).

## Efectos (useEffect)

- Segundo argumento: array de dependencias. Incluir todo lo que se lee dentro del efecto.
- Limpiar suscripciones, timers o listeners en la función de cleanup.

```tsx
useEffect(() => {
  const sub = subscribe(id);
  return () => sub.unsubscribe();
}, [id]);
```

- Evitar efectos que solo sincronizan estado derivable; preferir calcular durante el render cuando sea posible.
- Para fetch: considerar `useEffect` + estado de loading/error o librerías como TanStack Query (react-query) si hay caché e invalidación.

## Custom hooks

- Encapsular lógica reutilizable (estado + efectos) en hooks que empiecen por `use`.
- Un hook por responsabilidad; combinar varios en el componente si hace falta.

```tsx
function useLocalStorage<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? '') ?? initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}
```

## Optimización

- **useMemo**: cálculos costosos que dependen de props/estado; no abusar en cálculos triviales.
- **useCallback**: funciones pasadas a hijos memoizados o como dependencia de useEffect/useMemo.
- **React.memo**: envolver componentes que reciben props estables y se re-renderizan mucho; no por defecto en todo.

```tsx
const list = useMemo(() => items.filter(Boolean), [items]);
const handleSubmit = useCallback((e: React.FormEvent) => { ... }, [dep1, dep2]);
export const Item = React.memo(function Item({ id, name }: ItemProps) { ... });
```

## Context

- Para estado/theme que varios árboles necesitan; no como almacén global de todo.
- Dividir por dominio (AuthContext, ThemeContext) y exponer providers mínimos.
- Valor del context estable con useMemo si incluye objetos/funciones para evitar re-renders en cascada.

```tsx
const value = useMemo(() => ({ user, login, logout }), [user]);
return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
```

- Si el estado crece (formularios, caché, servidor): considerar TanStack Query, Zustand o similar en lugar de mucho Context.

## Code-splitting

- **React.lazy** + **Suspense** para rutas o vistas pesadas.

```tsx
const Dashboard = React.lazy(() => import('./Dashboard'));
<Suspense fallback={<Spinner />}>
  <Dashboard />
</Suspense>
```

## Formularios

- En este proyecto: **react-hook-form** + **zod** (@hookform/resolvers). Resolver con `zodResolver(schema)`.
- Registrar campos con `register('fieldName')` o con `<Controller>` para componentes controlados (p. ej. Radix).
- `handleSubmit(onValid, onInvalid)` para submit; errores en `formState.errors`.

## Datos del servidor

- Preferir **TanStack Query** (@tanstack/react-query): caché, refetch, loading/error, mutaciones.
- Para fetch manual: estado `data | loading | error`, `useEffect` con cleanup (AbortController) y dependencias correctas.

## Estructura de archivos

- Un componente principal por archivo; componentes muy pequeños pueden vivir en el mismo archivo si son privados.
- Nombres de archivos en PascalCase para componentes (`Button.tsx`, `UserCard.tsx`).
- Hooks en `use*.ts` o junto al componente si solo se usa ahí.
- Agrupar por feature o por tipo (components/, hooks/, pages/) según el proyecto.

## Testing

- **@testing-library/react**: render, screen, userEvent; evitar detalles de implementación.
- Probar comportamiento y accesibilidad (roles, labels); no estado interno.
- Mockear módulos/servicios cuando sea necesario (vi.mock).

## Checklist rápido

- [ ] Props e estado tipados; sin `any` innecesario.
- [ ] Dependencias de useEffect/useMemo/useCallback correctas.
- [ ] Limpieza en useEffect cuando hay suscripciones o timers.
- [ ] Estado inmutable (no mutar objetos/arrays).
- [ ] Componentes y hooks con una responsabilidad clara.
- [ ] Uso de Context solo donde aporte; estado complejo con librería si aplica.
- [ ] Lazy + Suspense para rutas o vistas grandes.
- [ ] Formularios con react-hook-form + zod cuando el proyecto ya los usa.
