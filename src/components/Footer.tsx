import adDeskLogo from '../images/ad-desk-white.svg';

const Footer = () => {
  return (
    <footer className="w-full bg-[#153ece] rounded-[34px] px-6 py-4 mt-6 flex items-center justify-between">
      <p className="text-white/50 text-xs">
        © {new Date().getFullYear()} AD Desk — Painel de Campanhas BRB
      </p>
      <img
        src={adDeskLogo}
        alt="AD Desk"
        className="h-6 w-auto brightness-0 invert opacity-60"
      />
    </footer>
  );
};

export default Footer;
