import MapView from '@/components/map/Map'


export default function Maps() {
  /* `dvh` and the shared header height: `globals.css` tracks both against
     `Navbar`, and `vh` overcounts behind a mobile URL bar. */
  return (
    <main className='relative h-[calc(100dvh-var(--shell-header-h))] w-full'>
      <MapView isChangeable={true} />
    </main>
  )
}
