# 💼 NextLevel Agenda - Financial Screens

Two premium financial screens for the NextLevel Agenda SaaS platform with Cyberpunk/Fintech aesthetic.

## 🎨 Design Theme

- **Background:** #050505 (OLED Black)
- **Primary:** #7C3AED (Electric Purple)
- **Accent:** #2DD4BF (Vibrant Teal)
- **Success:** #10B981 (Neon Green)
- **Style:** Glassmorphism + Dark OLED + Fintech/Crypto Wallet

## 🖥️ Screens Included

### 1. 📱 Booking Checkout Modal
**Context:** Mobile bottom sheet that appears when client clicks "Book"

**Features:**
- Booking summary card (Service + Barber + Date/Time)
- Payment method selector with big cards:
  - **Pay Now** (Pix/Card) with -5% discount badge (Neon Green)
  - **Pay at Counter** (Neutral)
- Large font total price with discount calculation
- Confirm & Secure Slot button
- Trust badges
- Smooth animations and transitions

**Vibe:** Trustworthy, Fast, Fintech-style

---

### 2. 💰 Barber's Wallet
**Context:** Professional view to check daily earnings

**Features:**
- **Balance Card** (Stock Market style):
  - Large balance display
  - Next payout info
  - Today's earnings
  - Client count
  - Growth percentage badge

- **Weekly Chart** (Crypto Wallet aesthetic):
  - Sparkline graph with gradient
  - Animated SVG line chart
  - 7-day earnings visualization
  - Hover effects

- **Today's Commissions**:
  - Scrollable list of clients
  - Service details
  - Time stamps
  - Individual commission amounts (+R$)
  - Green profit indicators

**Vibe:** Stock Market / Crypto Wallet

---

## 🚀 Quick Start

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

---

## 📁 Project Structure

```
nextlevel-agenda-finance/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── BookingCheckoutModal.tsx    # Checkout bottom sheet
│   │   │   └── BarberWallet.tsx            # Barber earnings dashboard
│   │   └── App.tsx                         # Main app with screen selector
│   └── styles/
│       ├── theme.css                       # Dark OLED theme
│       └── index.css                       # Global styles
├── package.json
└── README.md
```

---

## 🎯 Features Breakdown

### Booking Checkout Modal

#### Visual Elements:
- ✅ Glassmorphism background
- ✅ Handle bar for mobile sheet
- ✅ Gradient borders
- ✅ Large payment method cards
- ✅ Discount badge (Neon Green)
- ✅ Real-time price calculation
- ✅ Radio button selection with animation
- ✅ Trust indicators

#### Interactions:
- ✅ Slide up from bottom animation
- ✅ Backdrop blur
- ✅ Tap to select payment
- ✅ Tap outside to close
- ✅ Scale animation on button press

---

### Barber Wallet

#### Visual Elements:
- ✅ Stock market-style balance card
- ✅ Animated SVG sparkline chart
- ✅ Gradient area chart fill
- ✅ Glassmorphism cards
- ✅ Green profit indicators
- ✅ Growth percentage badges
- ✅ Custom scrollbar

#### Data Visualizations:
- ✅ Weekly earnings trend line
- ✅ Animated chart drawing
- ✅ Hover effects
- ✅ Grid background
- ✅ Gradient strokes

#### Commissions List:
- ✅ Scrollable container
- ✅ Client avatars (initials)
- ✅ Service details
- ✅ Time stamps
- ✅ Individual amounts
- ✅ Hover effects

---

## 🎨 Color Palette

```css
/* Backgrounds */
--bg-primary: #050505;     /* OLED Black */
--bg-card: rgba(255, 255, 255, 0.05);
--bg-hover: rgba(255, 255, 255, 0.10);

/* Brand Colors */
--purple: #7C3AED;         /* Primary */
--teal: #2DD4BF;           /* Accent */
--green: #10B981;          /* Success/Profit */

/* Borders */
--border: rgba(255, 255, 255, 0.1);
--border-active: rgba(124, 58, 237, 0.3);

/* Text */
--text-primary: #FFFFFF;
--text-secondary: rgba(255, 255, 255, 0.6);
```

---

## 🔧 Technologies

- **React 18.3.1** - UI Framework
- **Motion 12.23.24** - Animations (Framer Motion successor)
- **Lucide React** - Icons
- **Tailwind CSS 4.1.12** - Styling
- **Vite 6.3.5** - Build Tool

---

## 📱 Responsive Design

Both screens are fully responsive:

- **Mobile First** approach
- Optimized for iOS/Android
- Bottom sheet modal for mobile
- Grid layouts adapt to screen size
- Touch-friendly interactions

---

## ✨ Animation Details

### Checkout Modal:
- Spring animation on open/close
- Scale feedback on button press
- Fade in/out backdrop
- Check icon spring animation
- Smooth transitions

### Barber Wallet:
- Staggered list item animations
- Chart line drawing animation
- Pulsing growth indicators
- Hover scale effects
- Smooth scrolling

---

## 🎯 Usage Examples

### Show Checkout Modal:
```tsx
import { BookingCheckoutModal } from './components/BookingCheckoutModal';

const [isOpen, setIsOpen] = useState(false);

<BookingCheckoutModal 
  isOpen={isOpen} 
  onClose={() => setIsOpen(false)} 
/>
```

### Display Barber Wallet:
```tsx
import { BarberWallet } from './components/BarberWallet';

<BarberWallet />
```

---

## 🔮 Future Enhancements

- [ ] Connect to real payment API (Stripe/Pix)
- [ ] Add more chart types (bar, pie)
- [ ] Export earnings reports (PDF)
- [ ] Push notifications for new bookings
- [ ] Withdrawal request flow
- [ ] Multiple currency support
- [ ] Dark/Light theme toggle

---

## 📄 License

This project is for demonstration purposes.

---

## 🙏 Credits

- **Icons:** Lucide React
- **Design:** Cyberpunk/Fintech aesthetic
- **Inspiration:** Stock market apps, Crypto wallets

---

**Built with 💜 for NextLevel Agenda**

*Fintech meets Barbershop*
