const cor = (nome) => `rgb(var(--${nome}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        papel: cor('papel'), // fundo do app
        folha: cor('folha'), // superfícies
        tinta: cor('tinta'), // texto principal
        apagado: cor('apagado'), // texto secundário
        linha: cor('linha'), // bordas e trilhos
        cofre: cor('cofre'), // painel do saldo
        garoupa: cor('garoupa'), // ação principal (o azul-esverdeado da nota de R$ 100)
        'sobre-garoupa': cor('sobre-garoupa'),
        entrada: cor('entrada'), // receitas
        saida: cor('saida'), // despesas
        mico: cor('mico'), // atenção (o amarelo da nota de R$ 20)
      },
      fontFamily: {
        sans: ['"Figtree Variable"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        titulo: ['"Bricolage Grotesque Variable"', '"Figtree Variable"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        subir: {
          from: { transform: 'translateY(24px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        subir: 'subir 180ms ease-out',
      },
    },
  },
  plugins: [],
};
