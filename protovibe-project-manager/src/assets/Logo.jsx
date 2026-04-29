import logoUrl from './protovibe-studio-logo.png'

export default function Logo({ className, style }) {
  return <img src={logoUrl} alt="Protovibe Studio" className={className} style={style} />
}
