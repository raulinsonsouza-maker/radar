import { Link } from 'react-router-dom'
import '../App.css'

/** Número WhatsApp de vendas com DDI (ex: 5511999999999). Vazio → CTA vai para #oferta. */
const VENDAS_WHATSAPP = ''

const WA_MSG = encodeURIComponent(
  'Olá! Quero contratar o Radar Symbius por R$ 197/mês.',
)

function vendasHref(): string {
  const digits = VENDAS_WHATSAPP.replace(/\D/g, '')
  if (!digits) return '#oferta'
  return `https://wa.me/${digits}?text=${WA_MSG}`
}

export default function Landing() {
  const hireHref = vendasHref()
  const hireExternal = hireHref.startsWith('http')
  const hireProps = hireExternal
    ? { target: '_blank' as const, rel: 'noopener noreferrer' }
    : {}

  return (
    <div className="lp">
      <header className="lp-nav">
        <img src="/logotipo-branco.png" alt="Symbius" className="lp-logo" />
        <div className="lp-nav-actions">
          <a href="#como">Como funciona</a>
          <a href="#oferta">Preço</a>
          <Link to="/login" className="btn secondary sm">
            Entrar
          </Link>
        </div>
      </header>

      <section className="lp-hero">
        <p className="lp-kicker">Radar Symbius</p>
        <h1>
          Leads qualificados
          <br />
          para o nicho que você atende.
        </h1>
        <p className="lp-lead">
          Pare de gastar tempo com lista fria. Filtre empresas ativas do seu
          segmento, com contatos e decisores — usando dados oficiais de CNPJ.
        </p>
        <div className="lp-cta">
          <a href={hireHref} className="btn primary lg" {...hireProps}>
            Quero leads qualificados
          </a>
          <a href="#como" className="btn secondary lg">
            Ver como funciona
          </a>
        </div>
        <p className="lp-price-hint">Acesso completo · R$ 197/mês</p>
      </section>

      <section className="lp-strip" aria-label="Proposta">
        <div>
          <strong>Nicho certo</strong>
          <span>CNAE, cidade, porte e perfil da empresa</span>
        </div>
        <div>
          <strong>Contato útil</strong>
          <span>Telefone e WhatsApp quando disponíveis</span>
        </div>
        <div>
          <strong>Dado confiável</strong>
          <span>Base oficial da Receita Federal</span>
        </div>
      </section>

      <section className="lp-section" id="problema">
        <p className="lp-kicker">O problema</p>
        <h2>Lista genérica não vende. Lead do seu nicho vende.</h2>
        <p className="lp-lead">
          CNPJ baixado, planilha desatualizada e lead comprado sem filtro geram
          ligação vazia: empresa inativa, fora do segmento ou sem telefone.
          Seu comercial perde o dia — e a confiança no processo.
        </p>
        <ul className="lp-bullets">
          <li>Empresas fora do nicho que você atende</li>
          <li>Cadastros sem telefone ou e-mail úteis</li>
          <li>CNPJ baixado ou situação irregular</li>
          <li>Horas filtrando na mão o que deveria vir pronto</li>
        </ul>
      </section>

      <section className="lp-section lp-section-alt" id="solucao">
        <p className="lp-kicker">A solução</p>
        <h2>Radar: prospecção estruturada para o seu comercial.</h2>
        <p className="lp-lead">
          Você define o mercado-alvo. O Radar devolve empresas ativas alinhadas
          ao filtro, com contexto para abordar — não milhares de linhas sem
          critério.
        </p>
        <div className="lp-compare">
          <div>
            <p className="lp-compare-label">Lista comum</p>
            <ul className="lp-compare-bad">
              <li>Volume sem critério</li>
              <li>Muitos inativos ou irrelevantes</li>
              <li>Contato incompleto</li>
              <li>Trabalho manual depois da compra</li>
            </ul>
          </div>
          <div>
            <p className="lp-compare-label on">Com o Radar</p>
            <ul className="lp-compare-good">
              <li>Filtro por nicho e região</li>
              <li>Empresas ativas na Receita</li>
              <li>Telefone / WhatsApp / decisores</li>
              <li>Lista pronta para abordagem</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="lp-section" id="como">
        <p className="lp-kicker">Como funciona</p>
        <h2>Três passos do lead certo à conversa.</h2>
        <ol className="lp-steps">
          <li>
            <strong>Defina o nicho</strong>
            <span>
              Escolha segmento (CNAE), UF, município, porte, capital e se quer
              só quem tem telefone ou e-mail.
            </span>
          </li>
          <li>
            <strong>Gere a lista qualificada</strong>
            <span>
              Veja razão social, fantasia, localização, situação e perfil —
              apenas empresas ativas alinhadas ao filtro.
            </span>
          </li>
          <li>
            <strong>Aborde com contexto</strong>
            <span>
              Ligue ou mande WhatsApp. Veja sócios-administradores ou o titular
              quando a natureza jurídica for individual.
            </span>
          </li>
        </ol>
      </section>

      <section className="lp-section lp-section-alt" id="recursos">
        <p className="lp-kicker">O que você usa</p>
        <h2>Tudo que o comercial precisa na mesma tela.</h2>
        <ul className="lp-features">
          <li>
            <strong>Filtros comerciais reais</strong>
            <span>
              Nicho e CNAE, UF e município, natureza jurídica, porte, capital
              social, matriz, data de abertura e idade da empresa.
            </span>
          </li>
          <li>
            <strong>Contatos para abordagem</strong>
            <span>
              Telefone principal e segundo telefone, e-mail, e link de WhatsApp
              quando o número for celular.
            </span>
          </li>
          <li>
            <strong>Decisores</strong>
            <span>
              Sócios com qualificação (incluindo administrador) e titular em
              EI/EIRELI e naturezas equivalentes.
            </span>
          </li>
          <li>
            <strong>Contexto da empresa</strong>
            <span>
              Situação cadastral, Simples Nacional, quantidade de sócios e
              filiais — para priorizar quem vale a ligação.
            </span>
          </li>
          <li>
            <strong>Busca rápida</strong>
            <span>
              Encontre por razão social, nome fantasia ou CNPJ quando já souber
              quem quer abordar.
            </span>
          </li>
          <li>
            <strong>Acesso sem cota diária</strong>
            <span>
              Conta ativa = uso da prospecção. Sem limite artificial de buscas
              no plano atual.
            </span>
          </li>
        </ul>
      </section>

      <section className="lp-section" id="confianca">
        <p className="lp-kicker">Por que confiar</p>
        <h2>Dados oficiais. Empresas ativas. Processo claro.</h2>
        <ul className="lp-bullets">
          <li>
            Base construída a partir dos dados abertos de CNPJ da Receita
            Federal
          </li>
          <li>Foco em estabelecimentos ativos — menos tempo com CNPJ baixado</li>
          <li>MEI fora da base de prospecção comercial do Radar</li>
          <li>
            Você contrata, nós liberamos o login — sem cadastro aberto na
            internet
          </li>
        </ul>
      </section>

      <section className="lp-section lp-section-alt" id="para-quem">
        <p className="lp-kicker">Para quem é</p>
        <h2>Feito para quem vende B2B com método.</h2>
        <ul className="lp-bullets">
          <li>Empresas e prestadores que atendem um nicho específico</li>
          <li>Times comerciais que precisam de volume com qualidade</li>
          <li>Donos e gestores que cansaram de planilha improvisada</li>
          <li>Quem quer falar com quem decide — não só com a razão social</li>
        </ul>
      </section>

      <section className="lp-section" id="oferta">
        <p className="lp-kicker">Investimento</p>
        <h2>Menos que o custo de um dia perdido em lead ruim.</h2>
        <div className="lp-offer">
          <div className="lp-offer-price">
            <span className="lp-currency">R$</span>
            <span className="lp-amount">197</span>
            <span className="lp-period">/mês</span>
          </div>
          <p className="lp-offer-copy">
            Acesso completo ao Radar. Após a contratação, liberamos seu usuário
            e senha. Sem cartão na plataforma — venda assistida pela Symbius.
          </p>
          <ul className="lp-check">
            <li>Prospecção por nicho, região e contato</li>
            <li>Sócios, titulares e WhatsApp quando houver</li>
            <li>Dados oficiais de CNPJ</li>
            <li>Ativação da conta após o pagamento</li>
            <li>Suporte na liberação do acesso</li>
          </ul>
          <a href={hireHref} className="btn primary lg" {...hireProps}>
            Quero contratar o Radar
          </a>
        </div>
      </section>

      <section className="lp-section lp-section-alt" id="faq">
        <p className="lp-kicker">Dúvidas frequentes</p>
        <h2>Respostas diretas antes de comprar.</h2>
        <dl className="lp-faq">
          <div>
            <dt>De onde vêm os dados?</dt>
            <dd>
              Da base pública de CNPJ da Receita Federal, organizada para
              prospecção — não de lista aleatória de internet.
            </dd>
          </div>
          <div>
            <dt>Consigo filtrar pelo meu nicho?</dt>
            <dd>
              Sim. Use CNAE/nicho, cidade, UF, porte, capital, telefone, e-mail
              e outros critérios comerciais.
            </dd>
          </div>
          <div>
            <dt>Tem telefone e WhatsApp?</dt>
            <dd>
              Quando o estabelecimento tem telefone na base, você vê na ficha.
              Celular gera link de WhatsApp para facilitar a abordagem.
            </dd>
          </div>
          <div>
            <dt>Vejo sócios da empresa?</dt>
            <dd>
              Sim. Dá para abrir os sócios e identificar administradores. Em
              naturezas individuais, mostramos o titular.
            </dd>
          </div>
          <div>
            <dt>Como libero o acesso?</dt>
            <dd>
              Você contrata conosco. Criamos seu usuário ativo e enviamos login
              e senha. Inadimplência = acesso desativado.
            </dd>
          </div>
          <div>
            <dt>Posso exportar CSV?</dt>
            <dd>
              O foco do plano é prospecção na plataforma. Exportação não está
              disponível para o perfil cliente.
            </dd>
          </div>
        </dl>
      </section>

      <section className="lp-section lp-close">
        <h2>Seu próximo cliente já está no seu nicho.</h2>
        <p className="lp-lead">
          Contrate o Radar, receba o acesso e comece a abordar empresas que
          fazem sentido para o que você vende.
        </p>
        <div className="lp-cta">
          <a href={hireHref} className="btn primary lg" {...hireProps}>
            Falar com a Symbius
          </a>
          <Link to="/login" className="btn secondary lg">
            Já sou cliente — Entrar
          </Link>
        </div>
      </section>

      <footer className="lp-footer">
        <img src="/logotipo-branco.png" alt="" />
        <span>© {new Date().getFullYear()} Symbius · Radar</span>
      </footer>
    </div>
  )
}
