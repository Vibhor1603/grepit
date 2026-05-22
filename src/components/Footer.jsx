import Link from 'next/link';
import { ViboMark } from './ViboLogo';

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-10 px-6 md:px-8 mt-auto">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <ViboMark size={18} />
            <span className="text-[14px] font-semibold text-[#eaeaec] tracking-tight">Grep<span className="text-[#E0FC10]">it</span></span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-[12px] text-[#b0b0b8] hover:text-[#E0FC10] transition-colors duration-200">Privacy</Link>
            <Link href="/terms" className="text-[12px] text-[#b0b0b8] hover:text-[#E0FC10] transition-colors duration-200">Terms</Link>
            <Link href="/refund" className="text-[12px] text-[#b0b0b8] hover:text-[#E0FC10] transition-colors duration-200">Refunds</Link>
            <Link href="/faq" className="text-[12px] text-[#b0b0b8] hover:text-[#E0FC10] transition-colors duration-200">FAQ</Link>
            <a href="mailto:support@grepit.co" className="text-[12px] text-[#b0b0b8] hover:text-[#E0FC10] transition-colors duration-200">Contact</a>
          </div>
        </div>
        <div className="mt-6 pt-5 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-3">
          <span className="text-[11px] text-[#787884]">© {new Date().getFullYear()} Grepit. All rights reserved.</span>
          <span className="text-[11px] text-[#787884]">Built for developers who value their time.</span>
        </div>
      </div>
    </footer>
  );
}
