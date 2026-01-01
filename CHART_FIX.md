# 🔧 Chart Kütüphanesi Düzeltme Kılavuzu

React Native Chart Kit ile TypeScript uyumluluk sorunları olduğu için alternatif çözümler:

## Seçenek 1: Victory Native (Önerilen)

Victory Native daha modern ve TypeScript uyumlu bir kütüphanedir.

### Kurulum

```bash
npm uninstall react-native-chart-kit react-native-svg
npm install victory-native
```

### reports.tsx Güncelleme

```typescript
import { VictoryPie, VictoryChart, VictoryLine, VictoryAxis, VictoryTheme } from 'victory-native';

// Pasta Grafik
<VictoryPie
  data={categoryData.map(item => ({
    x: item.name,
    y: item.amount,
  }))}
  colorScale={categoryData.map(item => item.color)}
  labelRadius={100}
  style={{
    labels: { fontSize: 12, fill: "#333" }
  }}
  width={Dimensions.get('window').width - 40}
  height={220}
/>

// Çizgi Grafik
<VictoryChart
  theme={VictoryTheme.material}
  width={Dimensions.get('window').width - 40}
  height={220}
>
  <VictoryLine
    data={trend.expenses.map((value, index) => ({
      x: trend.months[index],
      y: value
    }))}
    style={{
      data: { stroke: "#FF3B30", strokeWidth: 2 }
    }}
  />
  <VictoryAxis />
  <VictoryAxis dependentAxis />
</VictoryChart>
```

## Seçenek 2: React Native Chart Kit Type Fix

Mevcut kütüphaneyi kullanmaya devam etmek isterseniz:

### Type Declaration Dosyası Oluştur

`types/react-native-chart-kit.d.ts` oluşturun:

```typescript
declare module 'react-native-chart-kit' {
  import { Component } from 'react';
  
  export interface ChartConfig {
    backgroundColor?: string;
    backgroundGradientFrom?: string;
    backgroundGradientTo?: string;
    decimalPlaces?: number;
    color?: (opacity?: number) => string;
    labelColor?: (opacity?: number) => string;
    style?: any;
    propsForDots?: any;
  }

  export interface AbstractChartProps {
    data: any;
    width: number;
    height: number;
    chartConfig?: ChartConfig;
    accessor?: string;
    backgroundColor?: string;
    paddingLeft?: string;
    absolute?: boolean;
    style?: any;
    bezier?: boolean;
  }

  export class PieChart extends Component<AbstractChartProps> {}
  export class LineChart extends Component<AbstractChartProps> {}
  export class BarChart extends Component<AbstractChartProps> {}
}
```

### tsconfig.json Güncelleme

```json
{
  "compilerOptions": {
    // ... mevcut ayarlar
    "typeRoots": ["./types", "./node_modules/@types"]
  }
}
```

## Seçenek 3: Recharts (Web İçin)

Sadece web versiyonu kullanıyorsanız:

```bash
npm install recharts
```

```typescript
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis } from 'recharts';

// Kullanımı daha kolay ve TypeScript uyumlu
```

## Seçenek 4: Chart Olmadan Kullanım

Grafikler olmadan da uygulama çalışabilir. reports.tsx'te grafik bölümlerini yoruma alın:

```typescript
{/* Geçici olarak devre dışı */}
{/* {categoryData.length > 0 && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Kategori Dağılımı</Text>
    <View style={styles.chartContainer}>
      ...
    </View>
  </View>
)} */}
```

## Önerilen Yaklaşım

1. **Victory Native kullanın** - En stabil ve TypeScript uyumlu
2. Grafikleri sonraya bırakın, önce diğer özellikleri test edin
3. Uygulama grafiksiz de tamamen fonksiyonel

## Test Komutları

```bash
# Victory Native ile
npm install victory-native
npm start

# Chart Kit olmadan
npm uninstall react-native-chart-kit react-native-svg
npm start
```

Hangisini seçerseniz seçin, uygulama çalışacaktır! 🚀
