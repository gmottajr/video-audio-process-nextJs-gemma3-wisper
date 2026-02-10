# Logo Background Fix - Multiple Solutions

## Issue: Logo has dark blue background, page is black

---

## **Current Solution (Applied):**

Wrapped logo in matching dark gradient + desaturated colors:
```tsx
<div className="relative bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-4 rounded-lg">
  <Image
    style={{
      filter: 'brightness(1.2) contrast(1.1) saturate(0)',
      mixBlendMode: 'screen',
    }}
  />
</div>
```

---

## **Alternative Solutions:**

### **Option 1: Complete Desaturation + Darken**
Makes everything grayscale and darkens the blue to black:
```tsx
<Image
  className="max-w-full h-auto"
  style={{
    filter: 'grayscale(1) brightness(0.3) contrast(1.5)',
    mixBlendMode: 'multiply',
  }}
/>
```

### **Option 2: Invert Colors (if logo is dark blue with light text)**
```tsx
<Image
  className="max-w-full h-auto"
  style={{
    filter: 'invert(1) hue-rotate(180deg) brightness(0.5)',
    mixBlendMode: 'normal',
  }}
/>
```

### **Option 3: Pure Black Background Wrapper**
Forces background to exact page color:
```tsx
<div className="bg-zinc-950 p-4 rounded-lg">
  <Image
    className="max-w-full h-auto opacity-90"
    style={{
      filter: 'saturate(0) brightness(1.1)',
      mixBlendMode: 'screen',
    }}
  />
</div>
```

### **Option 4: Overlay Method (Most Aggressive)**
Covers blue with black overlay:
```tsx
<div className="relative">
  <Image className="max-w-full h-auto" />
  <div 
    className="absolute inset-0 bg-zinc-950 pointer-events-none"
    style={{ mixBlendMode: 'color' }}
  />
</div>
```

### **Option 5: Remove Blue Channel**
Removes blue tint specifically:
```tsx
<Image
  className="max-w-full h-auto"
  style={{
    filter: 'brightness(1.1) contrast(1.2) sepia(0.2) hue-rotate(20deg)',
    mixBlendMode: 'screen',
  }}
/>
```

### **Option 6: CSS Background Override**
```tsx
<div className="relative">
  <Image 
    className="max-w-full h-auto"
    style={{
      background: 'linear-gradient(135deg, #0a0a0a 0%, #171717 50%, #0a0a0a 100%)',
      filter: 'saturate(0) brightness(1.15)',
      mixBlendMode: 'screen',
    }}
  />
</div>
```

---

## **Best Solution (Recommended):**

If the PNG has a solid blue background that you can't change, use **Option 1 (Grayscale + Darken)**:

```tsx
<div className="mb-3 flex justify-center">
  <Image
    src="/branding/NeuralGrooveLogoEnhanced.PNG"
    alt="Neural Groove Spectrum Divergent"
    width={500}
    height={200}
    priority
    className="max-w-full h-auto"
    style={{
      filter: 'grayscale(1) brightness(0.35) contrast(1.3)',
      mixBlendMode: 'multiply',
    }}
  />
</div>
```

This will:
1. Remove ALL color (including blue) → grayscale
2. Darken everything significantly → brightness(0.35)
3. Increase contrast for better text visibility → contrast(1.3)
4. Blend dark areas into page → multiply

---

## **How to Apply:**

Replace the logo section in `components/PageHeader.tsx` with any option above!

---

## **Note:**
The absolute best solution would be to **edit the PNG file** itself to have a transparent or black background, but these CSS solutions should work in the meantime!




