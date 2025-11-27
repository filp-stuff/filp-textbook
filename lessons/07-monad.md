---
layout: page
title: Monad
---

# Монады

## Содержание
- [Что такое монада?](#что-такое-монада)
- [Независимые и последовательные вычисления](#независимые-и-последовательные-вычисления)
- [Option Monad](#option-monad)
- [Either Monad](#either-monad)
- [For Comprehension](#for-comprehension)
- [Monad Laws](#monad-laws)
- [MonadError](#monaderror)
- [Reader Monad](#reader-monad)
- [Writer Monad](#writer-monad)
- [State Monad](#state-monad)
- [Комбинирование монад: RWS](#комбинирование-монад-rws)
- [Практическое применение Reader](#практическое-применение-reader)

---

## Что такое монада?

Монада — это одно из тех понятий в функциональном программировании, которое часто вызывает затруднения у разработчиков, пришедших из ООП-мира.

### Формальное определение

> Монада — это моноид в категории эндофункторов.

Это классическое математическое определение, над которым любят шутить программисты. Давайте рассмотрим более практичное объяснение:

> Монада — это паттерн проектирования для организации **последовательных вычислений** в контексте.

### Практическое понимание

Монада позволяет:
1. **Оборачивать значения** в контекст (например, `Option`, `Either`, `List`)
2. **Связывать вычисления**, где каждое следующее вычисление зависит от результата предыдущего
3. **Абстрагировать** обработку контекста (ошибки, отсутствие значения, множественность)

```scala
trait Monad[F[_]] extends Applicative[F] {
  def flatMap[A, B](fa: F[A])(f: A => F[B]): F[B]
}
```

---

## Независимые и последовательные вычисления

Ключевое различие между аппликативными функторами и монадами — в типе вычислений, которые они поддерживают.

### Независимые вычисления

При независимых вычислениях результат одной операции **не влияет** на другие операции:

```scala
// Независимые вычисления — порядок не важен
val name: Option[String] = Some("Alice")
val age: Option[Int] = Some(25)

// Можно вычислить параллельно
(name, age).mapN((n, a) => User(n, a))
```

Аппликативные функторы идеально подходят для независимых вычислений.

### Последовательные вычисления

При последовательных вычислениях каждое следующее вычисление **зависит от результата** предыдущего:

```scala
// Последовательные вычисления — порядок важен
def findUser(id: Int): Option[User]
def findAddress(user: User): Option[Address]
def findCity(address: Address): Option[City]

// Каждый шаг зависит от предыдущего
val city: Option[City] =
  findUser(42).flatMap(user =>
    findAddress(user).flatMap(address =>
      findCity(address)))
```

Именно для таких вычислений и нужны монады.

### Сравнение map и flatMap

| Тайпкласс | Метод | Входной тип | Функция | Выходной тип |
|-----------|-------|-------------|---------|--------------|
| `Functor` | `map` | `F[A]` | `A => B` | `F[B]` |
| `Monad` | `flatMap` | `F[A]` | `A => F[B]` | `F[B]` |

Ключевое различие: в `flatMap` функция сама возвращает значение в контексте `F[B]`, что позволяет организовывать цепочки зависимых вычислений.

---

## Option Monad

`Option` — это монада для работы с опциональными значениями.

### Базовое использование

```scala
Option("42").flatMap(value => value.toIntOption)  // Some(42)
Option("abc").flatMap(value => value.toIntOption) // None
```

### flatMap vs map + flatten

```scala
// flatMap эквивалентен map + flatten
Option("42").flatMap(value => value.toIntOption)
// то же самое, что:
Option("42")
  .map(value => value.toIntOption)  // Option[Option[Int]]
  .flatten                           // Option[Int]
```

### Цепочка зависимых вычислений

```scala
case class User(id: Long, name: String, surname: String)

def idByTag(tag: String): Option[Long]
def nameById(id: Long): Option[String]
def surnameById(id: Long): Option[String]

def loadUser(tag: String): Option[User] =
  idByTag(tag).flatMap { id =>
    nameById(id).flatMap { name =>
      surnameById(id).map { surname =>
        User(id, name, surname)
      }
    }
  }
```

Если любой из шагов возвращает `None`, вся цепочка возвращает `None`.

---

## Either Monad

`Either` — это монада для работы с вычислениями, которые могут завершиться ошибкой.

### Семантика Either

```scala
sealed trait Either[+L, +R]
case class Left[+L](value: L) extends Either[L, Nothing]   // Ошибка
case class Right[+R](value: R) extends Either[Nothing, R]  // Успех
```

По соглашению:
- `Left` содержит информацию об ошибке
- `Right` содержит успешный результат

> Мнемоника: "Right is right" (правый — правильный)

### Пример использования

```scala
Right("42").flatMap(value =>
  value.toIntOption.toRight("Parse failed")
)
// Right(42)

Right("abc").flatMap(value =>
  value.toIntOption.toRight("Parse failed")
)
// Left("Parse failed")
```

### Цепочка вычислений с Either

```scala
sealed trait Error
case class UserNotFound(tag: String) extends Error
case class NameNotFound(id: Long) extends Error

def idByTag(tag: String): Either[Error, Long]
def nameById(id: Long): Either[Error, String]
def surnameById(id: Long): Either[Error, String]

def loadUser(tag: String): Either[Error, User] =
  for {
    id      <- idByTag(tag)
    name    <- nameById(id)
    surname <- surnameById(id)
  } yield User(id, name, surname)
```

При первой ошибке вычисление прерывается и возвращается `Left` с ошибкой.

---

## For Comprehension

For comprehension — это синтаксический сахар Scala для работы с монадами.

### Преобразование flatMap в for

```scala
// Вложенные flatMap
def loadUser(tag: String): Option[User] =
  idByTag(tag).flatMap { id =>
    nameById(id).flatMap { name =>
      surnameById(id).map { surname =>
        User(id, name, surname)
      }
    }
  }

// Эквивалентный for comprehension
def loadUser(tag: String): Option[User] =
  for {
    id      <- idByTag(tag)
    name    <- nameById(id)
    surname <- surnameById(id)
  } yield User(id, name, surname)
```

### Правила трансляции

| For comprehension | Эквивалент |
|-------------------|------------|
| `for { x <- fa } yield expr` | `fa.map(x => expr)` |
| `for { x <- fa; y <- fb } yield expr` | `fa.flatMap(x => fb.map(y => expr))` |
| `for { x <- fa if cond } yield expr` | `fa.withFilter(x => cond).map(x => expr)` |

### Полиморфизм по монаде

Благодаря тайпклассам можно написать код, абстрагированный от конкретной монады:

```scala
import Monad.Syntax._

def loadUser[F[_]: Monad](tag: String): F[User] =
  for {
    id      <- idByTag(tag)
    name    <- nameById(id)
    surname <- surnameById(id)
  } yield User(id, name, surname)

// Можно использовать с любой монадой
loadUser[Option]("123")
loadUser[Either[String, *]]("444")
loadUser[Try]("456")
```

---

## Monad Laws

Любая корректная монада должна подчиняться трём законам.

### 1. Левая единица (Left Identity)

Оборачивание значения в монаду и применение функции эквивалентно простому применению функции:

```scala
Monad[F].pure(a).flatMap(f) == f(a)
```

Пример:
```scala
Option(42).flatMap(x => Option(x * 2)) == Option(42 * 2)
// Some(84) == Some(84) ✓
```

### 2. Правая единица (Right Identity)

Применение `pure` как функции к монадическому значению возвращает то же значение:

```scala
fa.flatMap(Monad[F].pure) == fa
```

Пример:
```scala
Some(42).flatMap(x => Some(x)) == Some(42)
// Some(42) == Some(42) ✓
```

### 3. Ассоциативность (Associativity)

Порядок группировки вложенных `flatMap` не влияет на результат:

```scala
fa.flatMap(f).flatMap(g) == fa.flatMap(a => f(a).flatMap(g))
```

Пример:
```scala
val fa = Some(2)
val f: Int => Option[Int] = x => Some(x + 1)
val g: Int => Option[Int] = x => Some(x * 2)

fa.flatMap(f).flatMap(g)          // Some(6)
fa.flatMap(a => f(a).flatMap(g))  // Some(6) ✓
```

### Зачем нужны законы?

Законы монад гарантируют:
- **Предсказуемость** — код ведёт себя ожидаемо
- **Рефакторинг** — можно безопасно преобразовывать код
- **Композицию** — монады можно комбинировать

---

## MonadError

`MonadError` — расширение монады для работы с ошибками.

### Определение

```scala
trait MonadError[F[_], E] extends Monad[F] {
  // Прервать вычисление с ошибкой
  def raiseError[A](e: E): F[A]

  // Обработать ошибку
  def handleErrorWith[A](fa: F[A])(f: E => F[A]): F[A]
}
```

### Основные методы

| Метод | Описание |
|-------|----------|
| `raiseError[A](e: E): F[A]` | Создать значение с ошибкой |
| `handleErrorWith[A](fa)(f: E => F[A]): F[A]` | Обработать ошибку, вернув новое значение |
| `handleError[A](fa)(f: E => A): F[A]` | Обработать ошибку, вернув чистое значение |
| `attempt[A](fa): F[Either[E, A]]` | Преобразовать ошибку в значение |
| `recover[A](fa)(pf: PartialFunction[E, A]): F[A]` | Восстановиться от части ошибок |

### Пример использования

```scala
import cats.MonadError
import cats.syntax.all._

def divide[F[_]](a: Int, b: Int)(implicit ME: MonadError[F, String]): F[Int] =
  if (b == 0) ME.raiseError("Division by zero")
  else ME.pure(a / b)

def safeDivide[F[_]: MonadError[*[_], String]](a: Int, b: Int): F[Int] =
  divide[F](a, b).handleError(_ => 0)

// Использование с Either
type Result[A] = Either[String, A]
divide[Result](10, 2)  // Right(5)
divide[Result](10, 0)  // Left("Division by zero")
safeDivide[Result](10, 0)  // Right(0)
```

---

## Reader Monad

`Reader` — монада для работы с зависимостями и конфигурацией.

### Проблема: глобальные зависимости

```scala
// Плохо: глобальная конфигурация
object Config {
  var apiUrl: String = "http://api.example.com"
}

def fetchUser(id: Int): String = {
  httpRequest(s"${Config.apiUrl}/users/$id")  // неявная зависимость!
}
```

### Решение: Reader Monad

```scala
// Reader — это просто функция от контекста к результату
final case class Reader[Ctx, Out](run: Ctx => Out)

object Reader {
  // Извлечь информацию из контекста
  def ask[Ctx, CtxInfo](f: Ctx => CtxInfo): Reader[Ctx, CtxInfo] =
    Reader(f)

  // Поместить значение в Reader
  def pure[Ctx, A](a: A): Reader[Ctx, A] =
    Reader(_ => a)
}
```

### Пример использования

```scala
case class Config(url: String, timeout: Int)

def httpRequest(url: String): Reader[Config, String] = {
  println(s"Http request $url")
  Reader.pure("Bob")
}

def getUserName(id: Int): Reader[Config, String] =
  for {
    url  <- Reader.ask[Config, String](_.url)
    name <- httpRequest(s"$url/users/$id")
  } yield name

// Запуск с конкретной конфигурацией
val result = getUserName(42).run(Config("http://api.example.com", 5000))
// result = "Bob"
```

### Преимущества Reader

1. **Явные зависимости** — все зависимости видны в типе
2. **Тестируемость** — легко подменить конфигурацию в тестах
3. **Композиция** — функции с Reader легко комбинировать
4. **Отложенное выполнение** — конфигурация предоставляется в момент запуска

---

## Writer Monad

`Writer` — монада для накопления логов или других побочных данных.

### Проблема: логирование с побочными эффектами

```scala
// Плохо: побочные эффекты разбросаны по коду
def processData(data: String): String = {
  println(s"Processing: $data")  // побочный эффект!
  val result = data.toUpperCase
  println(s"Result: $result")    // побочный эффект!
  result
}
```

### Решение: Writer Monad

```scala
// Writer хранит значение вместе с логом
case class Writer[Log, Value](run: (Log, Value)) {
  def tell(message: Log)(implicit monoid: Monoid[Log]): Writer[Log, Value] =
    run match {
      case (log, value) => Writer((log |+| message, value))
    }
}

object Writer {
  def tell[Log](message: Log): Writer[Log, Unit] =
    Writer((message, ()))

  def pure[Log: Monoid, A](a: A): Writer[Log, A] =
    Writer((Monoid[Log].empty, a))
}
```

### Пример использования

```scala
type Logs = List[String]

def httpRequest(url: String): Writer[Logs, String] =
  for {
    _        <- Writer.tell[Logs](List(s"Http request $url"))
    response <- Writer.pure[Logs, String]("Bob")
  } yield response

def getUserName(id: Int): Writer[Logs, String] =
  for {
    name <- httpRequest(s"http://api.example.com/users/$id")
    _    <- Writer.tell[Logs](List(s"Fetched name $name"))
  } yield name

val (logs, result) = getUserName(42).run
// logs = List("Http request http://api.example.com/users/42", "Fetched name Bob")
// result = "Bob"
```

### Преимущества Writer

1. **Чистые функции** — логирование без побочных эффектов
2. **Аккумуляция** — логи автоматически собираются
3. **Тестируемость** — можно проверить логи в тестах
4. **Отложенный вывод** — логи выводятся когда нужно, а не в момент создания

---

## State Monad

`State` — монада для работы с изменяемым состоянием в чистом стиле.

### Проблема: мутабельное состояние

```scala
// Плохо: изменяемое состояние
var counter = 0

def increment(): Int = {
  counter += 1  // мутация!
  counter
}
```

### Решение: State Monad

```scala
// State — функция от начального состояния к паре (новое состояние, результат)
final case class State[S, V](run: S => (S, V))

object State {
  // Запросить текущее состояние
  def get[S]: State[S, S] =
    State(s => (s, s))

  // Заменить состояние
  def set[S](newState: S): State[S, Unit] =
    State(_ => (newState, ()))

  // Обновить состояние функцией
  def modify[S](f: S => S): State[S, Unit] =
    State(s => (f(s), ()))

  // Извлечь часть состояния
  def inspect[S, A](f: S => A): State[S, A] =
    State(s => (s, f(s)))
}
```

### Пример использования

```scala
def updateState(command: String): State[Int, String] =
  for {
    current <- State.get[Int]
    _ <- command match {
      case "increment" => State.modify[Int](_ + 1)
      case "decrement" => State.modify[Int](_ - 1)
      case _           => State.modify[Int](identity)
    }
    updated <- State.get[Int]
  } yield if (current != updated) "updated" else "unchanged"

val (finalState, result) = updateState("increment").run(100)
// finalState = 101
// result = "updated"
```

### Композиция State-вычислений

```scala
def push[A](a: A): State[List[A], Unit] =
  State.modify(a :: _)

def pop[A]: State[List[A], Option[A]] =
  State { stack =>
    stack match {
      case Nil     => (Nil, None)
      case x :: xs => (xs, Some(x))
    }
  }

val stackOperations: State[List[Int], (Option[Int], Option[Int])] =
  for {
    _  <- push(1)
    _  <- push(2)
    _  <- push(3)
    a  <- pop
    b  <- pop
  } yield (a, b)

val (finalStack, result) = stackOperations.run(Nil)
// finalStack = List(1)
// result = (Some(3), Some(2))
```

### Преимущества State

1. **Чистота** — нет мутаций, только преобразования
2. **Предсказуемость** — одинаковый вход даёт одинаковый выход
3. **Тестируемость** — легко проверить состояние до и после
4. **Композиция** — State-вычисления легко объединять

---

## Комбинирование монад: RWS

Reader, Writer и State можно объединить в одну монаду **RWS** (Reader-Writer-State).

### Эволюция комбинирования

```
          Reader[R, A]
              ↓
    + Writer → ReaderWriter[R, W, A]
              ↓
    + State  → RWS[R, W, S, A]
```

### Определение RWS

```scala
// RWS объединяет все три монады
case class RWS[R, W, S, A](run: (R, S) => (W, S, A))

// R — контекст (Reader)
// W — лог (Writer)
// S — состояние (State)
// A — результат
```

### Компоненты RWS

| Компонент | Что делает | Аналог |
|-----------|------------|--------|
| Reader | Читает конфигурацию | Dependency Injection |
| Writer | Накапливает логи | Logging |
| State | Управляет состоянием | Mutable state |

### Пример использования

```scala
case class Config(multiplier: Int)
type Logs = List[String]

type App[A] = RWS[Config, Logs, Int, A]

def increment: App[Unit] =
  for {
    config  <- RWS.ask[Config, Logs, Int]
    current <- RWS.get[Config, Logs, Int]
    _       <- RWS.tell[Config, Logs, Int](
                 List(s"Incrementing $current by ${config.multiplier}")
               )
    _       <- RWS.modify[Config, Logs, Int](_ + config.multiplier)
  } yield ()

val program: App[Int] =
  for {
    _ <- increment
    _ <- increment
    _ <- increment
    result <- RWS.get[Config, Logs, Int]
  } yield result

val (logs, finalState, result) = program.run(Config(10), 0)
// logs = List(
//   "Incrementing 0 by 10",
//   "Incrementing 10 by 10",
//   "Incrementing 20 by 10"
// )
// finalState = 30
// result = 30
```

---

## Практическое применение Reader

Reader особенно полезен для внедрения зависимостей (Dependency Injection) в функциональном стиле.

### Традиционный подход: передача контекста

```scala
// Контекст приходится передавать через все функции
def processRequest(ctx: Context, request: Request): Response = {
  val user = getUser(ctx, request.userId)
  val data = fetchData(ctx, user)
  formatResponse(ctx, data)
}

def getUser(ctx: Context, id: Long): User = ???
def fetchData(ctx: Context, user: User): Data = ???
def formatResponse(ctx: Context, data: Data): Response = ???
```

### Reader подход: неявный контекст

```scala
case class Context(db: Database, http: HttpClient, logger: Logger)

def processRequest(request: Request): Reader[Context, Response] =
  for {
    user <- getUser(request.userId)
    data <- fetchData(user)
    resp <- formatResponse(data)
  } yield resp

def getUser(id: Long): Reader[Context, User] =
  Reader.ask[Context, Database](_.db).flatMap { db =>
    Reader.pure(db.findUser(id))
  }

def fetchData(user: User): Reader[Context, Data] =
  Reader.ask[Context, HttpClient](_.http).flatMap { http =>
    Reader.pure(http.fetch(user.dataUrl))
  }

def formatResponse(data: Data): Reader[Context, Response] =
  Reader.pure(Response(data.toString))

// Запуск с реальным контекстом
val response = processRequest(request).run(productionContext)

// Запуск с тестовым контекстом
val testResponse = processRequest(request).run(testContext)
```

### Преимущества Reader для DI

1. **Явность** — зависимости видны в типах функций
2. **Тестируемость** — легко подменить зависимости в тестах
3. **Композиция** — функции с Reader естественно комбинируются
4. **Ленивость** — контекст предоставляется только в точке запуска
5. **Отсутствие магии** — нет аннотаций, рефлексии или DI-контейнеров

---

## Библиотека Cats

[Cats](https://typelevel.org/cats/) — это библиотека, предоставляющая абстракции для функционального программирования в Scala.

### Что даёт Cats

- Реализации стандартных тайпклассов: `Functor`, `Applicative`, `Monad`, `MonadError`
- Готовые типы данных: `Reader`, `Writer`, `State`, `EitherT`, `OptionT`
- Синтаксические расширения для удобной работы
- Законы для тестирования собственных реализаций

### Пример использования Cats

```scala
import cats._
import cats.data._
import cats.syntax.all._

// Reader из Cats
val greet: Reader[String, String] = Reader(name => s"Hello, $name!")
greet.run("World")  // "Hello, World!"

// Writer из Cats
val logged: Writer[List[String], Int] =
  42.writer(List("computed 42"))
logged.run  // (List("computed 42"), 42)

// State из Cats
val increment: State[Int, String] =
  State(n => (n + 1, s"was $n"))
increment.run(0).value  // (1, "was 0")
```

### Полезные ресурсы

- [Официальная документация Cats](https://typelevel.org/cats/)
- [Scala with Cats](https://www.scalawithcats.com/) — бесплатная книга
- [Herding Cats](https://eed3si9n.com/herding-cats/) — практическое руководство

---

## Резюме

В этой лекции мы изучили:

1. **Монада** — паттерн для организации последовательных вычислений в контексте
2. **Независимые vs последовательные вычисления** — ключевое различие между Applicative и Monad
3. **Option и Either** — стандартные монады для работы с опциональными значениями и ошибками
4. **For comprehension** — синтаксический сахар для работы с монадами
5. **Monad Laws** — три закона, которым должна подчиняться каждая монада
6. **MonadError** — расширение монады для обработки ошибок
7. **Reader** — монада для работы с зависимостями и конфигурацией
8. **Writer** — монада для накопления логов без побочных эффектов
9. **State** — монада для работы с изменяемым состоянием в чистом стиле
10. **RWS** — комбинация Reader, Writer и State

### Когда использовать какую монаду

| Монада | Используйте когда |
|--------|-------------------|
| `Option` | Значение может отсутствовать |
| `Either` | Нужна информация об ошибке |
| `Try` | Работа с исключениями Java |
| `Reader` | Нужен доступ к конфигурации/зависимостям |
| `Writer` | Нужно накапливать логи |
| `State` | Нужно работать с состоянием |
| `IO` | Любые побочные эффекты (отдельная лекция) |

---

[← Назад к содержанию](../index.html)
