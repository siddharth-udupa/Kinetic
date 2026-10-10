import MapView from '@/components/map/Map'


export default function Maps() {
  /* `dvh`, and the shared header height rather than a literal — `globals.css` already
     tracks both against `Navbar`. A literal left a gap under the header on small
     viewports, and `vh` overcounts behind a mobile URL bar. */
  return (
    <main className='relative h-[calc(100dvh-var(--shell-header-h))] w-full'>
      <MapView isChangeable={true} />
    </main>
  )
}
