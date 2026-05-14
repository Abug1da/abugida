import { useParams } from 'react-router-dom'

export default function LessonDetail() {
  const { id } = useParams()
  return <h1 className="text-3xl font-bold text-gray-900">Lesson {id}</h1>
}
