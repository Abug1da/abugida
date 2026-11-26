import { useParams } from 'react-router-dom'

export default function LessonDetail() {
  const { id } = useParams()
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl">Lesson {id}</h1>
    </div>
  )
}
