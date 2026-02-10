# Logo Background Blend Options

## Current Implementation: ✅
```tsx
style={{
  mixBlendMode: 'screen',
  filter: 'brightness(1.1) contrast(1.05)',
}}
```

## Alternative Options:

### Option 1: Multiply (for light logos on dark bg)
```tsx
style={{
  mixBlendMode: 'multiply',
  filter: 'invert(1) brightness(1.2)',
}}
```

### Option 2: Lighten (preserves bright colors)
```tsx
style={{
  mixBlendMode: 'lighten',
  filter: 'brightness(1.15)',
}}
```

### Option 3: Color-Dodge (dramatic effect)
```tsx
style={{
  mixBlendMode: 'color-dodge',
  filter: 'brightness(0.9)',
}}
```

### Option 4: Hard-Light (strong contrast)
```tsx
style={{
  mixBlendMode: 'hard-light',
  filter: 'brightness(1.2) contrast(1.1)',
}}
```

### Option 5: Overlay (balanced)
```tsx
style={{
  mixBlendMode: 'overlay',
  filter: 'brightness(1.3)',
}}
```

### Option 6: Remove background entirely (if PNG has transparency)
```tsx
// No blend mode needed if logo already has transparent background
className="max-w-full h-auto opacity-95"
```

## How to Change:

Just replace the `style` prop in `components/PageHeader.tsx` with any option above!




