---
layout: page
title: Монада IO
---

# Монада IO

В этой лекции мы рассмотрим `IO` — монаду для описания побочных эффектов в функциональном программировании. Мы изучим, как IO решает проблемы Future и позволяет писать чистый, композируемый и безопасный асинхронный код.

## Содержание
- [Проблемы Future](#проблемы-future)
- [IO монада](#io-монада)
- [Создание IO](#создание-io)
- [Композиция вычислений](#композиция-вычислений)
- [Запуск IO](#запуск-io)
- [Работа с ошибками](#работа-с-ошибками)
- [Fibers](#fibers)
- [Stack Safety](#stack-safety)
- [Базовые структуры](#базовые-структуры)
- [Type Classes](#type-classes)

---

## Проблемы Future

Прежде чем перейти к IO, вспомним, какие проблемы есть у `Future`.

### Преимущества Future

Future действительно решает многие проблемы:

| Преимущество | Описание |
|--------------|----------|
| Лучше колбэков | Читаемый код с for comprehension |
| Композиция | Цепочки вычислений через `map` и `flatMap` |
| Обработка ошибок | Стандартный механизм с `recover` и `recoverWith` |

### Недостатки Future

Однако у Future есть серьёзные ограничения:

| Недостаток | Описание |
|------------|----------|
| Требует ExecutionContext | Нужно везде передавать EC (явно или неявно) |
| Нет отмены | Невозможно отменить запущенное вычисление |
| Не чистая | Вычисление запускается **сразу** при создании |
| Не ссылочно прозрачна | Нарушает принципы ФП |

### Eager evaluation — главная проблема

```scala
val future = Future {
  println("Побочный эффект!")
  42
}
// "Побочный эффект!" выводится НЕМЕДЛЕННО,
// даже если мы не используем future!
```

Это делает Future **нечистой** — мы не можем рассуждать о программе как о математических выражениях.

### Отсутствие отмены

```scala
val future = Future {
  Thread.sleep(10000)  // Долгая операция
  heavyComputation()
}

// Через секунду мы поняли, что результат не нужен
// Но отменить future НЕВОЗМОЖНО!
// Вычисление продолжает выполняться в фоне
```

Эти проблемы решает монада **IO**.

---

## IO монада

### Что такое IO?

`IO[A]` — это **описание** вычисления, которое при выполнении может произвести побочные эффекты и вернуть значение типа `A`.

```scala
import cats.effect.IO
```

**Ключевое отличие от Future:** IO — это только **описание** действия, а не само действие. Вычисление не выполняется, пока мы явно не запустим его.

### Что может описывать IO?

| Возможность | Описание |
|-------------|----------|
| Side effects | Побочные эффекты (ввод/вывод, мутации) |
| Асинхронные вычисления | Неблокирующие операции |
| Параллельные вычисления | Одновременное выполнение задач |
| Блокирующие вычисления | Операции, блокирующие поток |
| Обработка ошибок | Восстановление после исключений |
| Отмена | Прерывание выполнения |

### Аналогия: рецепт vs приготовление

```
Future — это повар, который СРАЗУ начинает готовить,
         как только вы произнесли название блюда.

IO     — это рецепт. Сам по себе он ничего не делает.
         Готовка начнётся только когда вы скажете "Поехали!".
```

### Ленивость IO

```scala
// Future: выполняется СРАЗУ
val future = Future {
  println("Future: выполняюсь!")
  42
}
// Вывод: "Future: выполняюсь!" (немедленно)

// IO: это только ОПИСАНИЕ
val io = IO {
  println("IO: выполняюсь!")
  42
}
// Вывод: (ничего) — IO ещё не запущен!
```

---

## Создание IO

### Основные методы создания

```scala
def pure[A](value: A): IO[A]

def delay[A](thunk: => A): IO[A]

def apply[A](thunk: => A): IO[A] = delay(thunk)
```

### IO.pure

`IO.pure` создаёт IO с уже известным значением. Вычисление **не откладывается**:

```scala
val io: IO[Int] = IO.pure(42)
// Эквивалентно созданию "коробки" с готовым значением
```

**Важно:** Не используйте `IO.pure` для побочных эффектов!

```scala
// НЕПРАВИЛЬНО! Побочный эффект выполнится сразу
val bad: IO[Unit] = IO.pure(println("Ой!"))

// ПРАВИЛЬНО! Побочный эффект отложен
val good: IO[Unit] = IO.delay(println("Отложено"))
```

### IO.delay и IO.apply

`IO.delay` (и его синоним `IO.apply`) создаёт IO с отложенным вычислением:

```scala
val io: IO[Int] = IO.delay {
  println("Это выполнится только при запуске!")
  42
}

// Сокращённая запись через apply
val io2: IO[Int] = IO {
  println("То же самое")
  42
}
```

### Это чистая функция?

```scala
def readDatabase(key: String): IO[Double] = IO.delay {
  // тут какая-то логика похода в бд
  database.read(key)
}
```

**Да!** Функция `readDatabase` — **чистая**. Она не выполняет побочный эффект, а возвращает **описание** этого эффекта. Сам поход в базу данных произойдёт только при запуске IO.

### Сравнение с Future

```scala
// Future: НЕЧИСТАЯ функция — выполняется сразу
def readDatabaseFuture(key: String)(implicit ec: ExecutionContext): Future[Double] = Future {
  database.read(key)  // Выполняется НЕМЕДЛЕННО!
}

// IO: ЧИСТАЯ функция — только описание
def readDatabaseIO(key: String): IO[Double] = IO {
  database.read(key)  // Выполнится только при запуске IO
}
```

---

## Композиция вычислений

IO поддерживает все стандартные монадические операции.

### map: трансформация результата

```scala
def map[B](f: A => B): IO[B]
```

```scala
val io: IO[Int] = IO(42)
val mapped: IO[String] = io.map(n => s"Результат: $n")
// При запуске вернёт "Результат: 42"
```

### flatMap: последовательная композиция

```scala
def flatMap[B](f: A => IO[B]): IO[B]
```

```scala
def readUser(id: Long): IO[User] = IO { /* ... */ }
def readOrders(user: User): IO[List[Order]] = IO { /* ... */ }

val orders: IO[List[Order]] =
  readUser(42).flatMap(user => readOrders(user))
```

### For comprehension

Благодаря `map` и `flatMap`, IO поддерживает **for comprehension**:

```scala
val program: IO[(User, List[Order], Double)] = for {
  user   <- readUser(42)
  orders <- readOrders(user)
  total  <- calculateTotal(orders)
} yield (user, orders, total)

// Ничего не выполняется, пока мы не запустим program!
```

### Ссылочная прозрачность

В отличие от Future, IO **ссылочно прозрачен**:

```scala
// Эти два выражения ЭКВИВАЛЕНТНЫ:

// Вариант 1
val io = IO(println("hello"))
for {
  _ <- io
  _ <- io
} yield ()
// Выведет "hello" дважды

// Вариант 2
for {
  _ <- IO(println("hello"))
  _ <- IO(println("hello"))
} yield ()
// Тоже выведет "hello" дважды

// Поведение ИДЕНТИЧНО — это и есть ссылочная прозрачность!
```

---

## Запуск IO

IO — это только описание. Чтобы выполнить вычисление, нужно его **запустить**.

### Методы запуска (unsafe)

| Метод | Описание |
|-------|----------|
| `unsafeRunSync()` | Блокирующий запуск, возвращает результат |
| `unsafeRunAndForget()` | Запуск без ожидания результата |
| `unsafeRunCancelable()` | Запуск с возможностью отмены |
| `unsafeToFuture()` | Преобразование в Future |

### Почему "unsafe"?

Методы называются `unsafe*`, потому что они **выходят за пределы чистого функционального мира**:

```scala
val io: IO[Int] = IO {
  println("Побочный эффект!")
  42
}

// Чистый мир — никаких эффектов
val program = io.map(_ + 1)

// Переход в "грязный" мир — эффекты выполняются
val result: Int = program.unsafeRunSync()
// Выводит "Побочный эффект!" и возвращает 43
```

### IOApp — правильный способ запуска

Вместо ручного вызова `unsafeRunSync()` рекомендуется использовать `IOApp`:

```scala
import cats.effect.{IO, IOApp}

object MyApp extends IOApp.Simple {
  def run: IO[Unit] = for {
    _ <- IO.println("Привет!")
    name <- IO.readLine
    _ <- IO.println(s"Привет, $name!")
  } yield ()
}
```

`IOApp` берёт на себя:
- Правильный запуск IO
- Обработку сигналов завершения
- Управление ресурсами
- Graceful shutdown

### Разница миров

```
┌─────────────────────────────────────────────────────────────────┐
│                    Чистый функциональный мир                     │
│                                                                  │
│   IO[A] → map → flatMap → recover → ...  (только описания)      │
│                                                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ unsafeRunSync() / IOApp
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Мир побочных эффектов                        │
│                                                                  │
│   Реальный ввод/вывод, сеть, база данных, файлы, ...            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Работа с ошибками

IO предоставляет богатый API для работы с ошибками.

### Создание ошибки

```scala
def raiseError[A](t: Throwable): IO[A]
```

```scala
val error: IO[Int] = IO.raiseError(new RuntimeException("Что-то пошло не так!"))
```

### Перехват ошибок

Преобразование ошибки в значение:

```scala
def attempt: IO[Either[Throwable, A]]

def option: IO[Option[A]]
```

```scala
val risky: IO[Int] = IO.raiseError(new Exception("Ошибка!"))

val safe: IO[Either[Throwable, Int]] = risky.attempt
// При запуске вернёт Left(Exception("Ошибка!"))

val safeOption: IO[Option[Int]] = risky.option
// При запуске вернёт None
```

### handleError: обработка с возвратом значения

```scala
def handleError[B >: A](f: Throwable => B): IO[B]

def handleErrorWith[B >: A](f: Throwable => IO[B]): IO[B]
```

```scala
val risky: IO[Int] = IO.raiseError(new Exception("Ошибка!"))

// Вернуть значение по умолчанию
val safe: IO[Int] = risky.handleError(_ => 0)

// Выполнить альтернативное IO
val safeWithRetry: IO[Int] = risky.handleErrorWith { error =>
  IO.println(s"Ошибка: $error, пробуем ещё раз...") *> retryOperation
}
```

### recover: частичная обработка

```scala
def recover[B >: A](pf: PartialFunction[Throwable, B]): IO[B]

def recoverWith[B >: A](pf: PartialFunction[Throwable, IO[B]]): IO[B]
```

```scala
val risky: IO[Int] = IO.raiseError(new TimeoutException())

val safe: IO[Int] = risky.recover {
  case _: TimeoutException => 0
  case _: IOException => -1
  // Другие ошибки пробрасываются дальше
}
```

### redeem: обработка обоих случаев

```scala
def redeem[B](recover: Throwable => B, map: A => B): IO[B]

def redeemWith[B](recover: Throwable => IO[B], bind: A => IO[B]): IO[B]
```

```scala
val risky: IO[Int] = IO(riskyComputation())

val result: IO[String] = risky.redeem(
  recover = err => s"Ошибка: ${err.getMessage}",
  map = value => s"Успех: $value"
)
```

### Сравнение методов обработки ошибок

| Метод | Возвращает | Когда использовать |
|-------|------------|-------------------|
| `attempt` | `IO[Either[Throwable, A]]` | Нужно явно обработать оба случая |
| `option` | `IO[Option[A]]` | Ошибка не важна, достаточно None |
| `handleError` | `IO[B]` | Заменить ошибку значением |
| `handleErrorWith` | `IO[B]` | Заменить ошибку другим IO |
| `recover` | `IO[B]` | Обработать только некоторые типы ошибок |
| `redeem` | `IO[B]` | Обработать оба случая одной функцией |

---

## Fibers

**Fiber** (файбер) — это легковесный "зелёный поток", управляемый библиотекой Cats Effect.

### Кооперативная vs Вытесняющая многозадачность

| Тип | Описание | Пример |
|-----|----------|--------|
| **Вытесняющая** | ОС принудительно переключает потоки | Системные потоки (Thread) |
| **Кооперативная** | Задачи сами уступают управление | Fiber в Cats Effect |

Fiber'ы используют **кооперативную многозадачность** — они эффективнее системных потоков и их можно создавать тысячами.

### Создание Fiber

```scala
def start: IO[FiberIO[A]]
```

```scala
val task: IO[Int] = IO {
  Thread.sleep(1000)
  42
}

val fiber: IO[FiberIO[Int]] = task.start
// Возвращает fiber, выполняющийся в фоне
```

### Ожидание результата

```scala
def join: IO[Outcome[IO, Throwable, A]]
```

```scala
val program: IO[Int] = for {
  fiber  <- longComputation.start    // Запускаем в фоне
  _      <- doSomethingElse          // Делаем что-то параллельно
  result <- fiber.join               // Ждём результат fiber
} yield result match {
  case Outcome.Succeeded(io) => // Успех
  case Outcome.Errored(e)    => // Ошибка
  case Outcome.Canceled()    => // Отменён
}
```

### Параллельные комбинаторы

Для удобной работы с параллельными вычислениями:

```scala
def parTraverse[A, B](list: List[A])(f: A => IO[B]): IO[List[B]]

def parSequence[A](list: List[IO[A]]): IO[List[A]]
```

```scala
val ids = List(1L, 2L, 3L, 4L, 5L)

// Последовательно — долго
val sequential: IO[List[User]] = ids.traverse(fetchUser)

// Параллельно — быстро!
val parallel: IO[List[User]] = ids.parTraverse(fetchUser)
```

### Визуализация параллельного выполнения

```
Последовательно (traverse):
──[fetch 1]──[fetch 2]──[fetch 3]──[fetch 4]──[fetch 5]──▶ время

Параллельно (parTraverse):
──[fetch 1]──┐
──[fetch 2]──┤
──[fetch 3]──┼──▶ результат (намного быстрее!)
──[fetch 4]──┤
──[fetch 5]──┘
```

### Отмена (Cancellation)

В отличие от Future, IO поддерживает **отмену**:

```scala
val program: IO[Unit] = for {
  fiber <- longRunningTask.start
  _     <- IO.sleep(1.second)
  _     <- fiber.cancel              // Отменяем задачу!
} yield ()
```

При отмене:
- Fiber прекращает выполнение
- Освобождаются захваченные ресурсы
- `join` вернёт `Outcome.Canceled()`

```scala
val cancellableTask: IO[Unit] = IO.uncancelable { poll =>
  // Этот блок нельзя отменить
  acquireResource *> poll(useResource) *> releaseResource
  // poll(_) — точка, где отмена разрешена
}
```

---

## Stack Safety

IO гарантирует **безопасность стека** даже при глубокой рекурсии.

### Проблема с обычной рекурсией

```scala
// Обычная рекурсия — Stack Overflow!
def factorial(n: BigInt): BigInt =
  if (n <= 1) 1
  else n * factorial(n - 1)

factorial(100000)  // StackOverflowError!
```

### Трамполининг в IO

IO использует **трамполининг** (trampolining) — технику, которая превращает рекурсию в итерацию:

```scala
// С IO — безопасно для стека!
def factorialIO(n: BigInt): IO[BigInt] =
  if (n <= 1) IO.pure(BigInt(1))
  else factorialIO(n - 1).map(_ * n)

factorialIO(100000).unsafeRunSync()  // Работает!
```

### Как это работает?

```
Обычная рекурсия:
┌─────────────────────────────────────────┐
│ factorial(5)                            │
│   ├─ factorial(4)                       │
│   │   ├─ factorial(3)                   │
│   │   │   ├─ factorial(2)               │
│   │   │   │   ├─ factorial(1)           │  ← Стек растёт!
│   │   │   │   │   └─ return 1           │
│   │   │   │   └─ return 2               │
│   │   │   └─ return 6                   │
│   │   └─ return 24                      │
│   └─ return 120                         │
└─────────────────────────────────────────┘

Трамполининг в IO:
┌──────────────────────────────┐
│ Цикл интерпретатора IO:      │
│   step 1: IO(factorial(4))   │  ← Стек НЕ растёт!
│   step 2: IO(factorial(3))   │    Каждый шаг выполняется
│   step 3: IO(factorial(2))   │    в одном фрейме стека
│   step 4: IO(factorial(1))   │
│   step 5: return 1           │
│   step 6: map(1 * 2)         │
│   ...                        │
└──────────────────────────────┘
```

### Бесконечные циклы

IO безопасно поддерживает бесконечные циклы:

```scala
val forever: IO[Unit] = IO.println("Привет!") >> IO.sleep(1.second) >> forever

// Или с использованием foreverM
val forever2: IO[Nothing] = (IO.println("Привет!") >> IO.sleep(1.second)).foreverM
```

### Когда @tailrec не нужен

С IO вам **не нужна** аннотация `@tailrec`:

```scala
// С обычными функциями нужен @tailrec
@tailrec
def loop(n: Int, acc: Int): Int =
  if (n <= 0) acc else loop(n - 1, acc + n)

// С IO @tailrec не нужен — безопасность гарантирована!
def loopIO(n: Int, acc: Int): IO[Int] =
  if (n <= 0) IO.pure(acc)
  else IO.defer(loopIO(n - 1, acc + n))
```

---

## Базовые структуры

Cats Effect предоставляет набор примитивов для конкурентного программирования.

### Ref — атомарная ссылка

`Ref[IO, A]` — потокобезопасная мутабельная ссылка:

```scala
import cats.effect.Ref

val program: IO[Int] = for {
  ref    <- Ref.of[IO, Int](0)       // Создаём Ref с начальным значением
  _      <- ref.update(_ + 1)         // Атомарно увеличиваем
  _      <- ref.update(_ + 1)
  result <- ref.get                   // Читаем значение
} yield result  // 2
```

Основные операции:

| Метод | Описание |
|-------|----------|
| `get` | Получить текущее значение |
| `set(a)` | Установить новое значение |
| `update(f)` | Атомарно обновить значение |
| `modify(f)` | Обновить и вернуть результат |

### Deferred — одноразовый Promise

`Deferred[IO, A]` — примитив для однократной передачи значения между fiber'ами:

```scala
import cats.effect.Deferred

val program: IO[Int] = for {
  deferred <- Deferred[IO, Int]
  _        <- (IO.sleep(1.second) *> deferred.complete(42)).start  // Producer
  result   <- deferred.get                                          // Consumer (блокируется)
} yield result  // 42 (через 1 секунду)
```

### Semaphore — семафор

`Semaphore[IO]` — ограничивает количество параллельных операций:

```scala
import cats.effect.std.Semaphore

val program: IO[Unit] = for {
  sem <- Semaphore[IO](3)  // Максимум 3 параллельных операции
  _   <- (1 to 10).toList.parTraverse { i =>
           sem.permit.use { _ =>
             IO.println(s"Выполняю задачу $i") *> IO.sleep(1.second)
           }
         }
} yield ()
```

### Resource — безопасное управление ресурсами

`Resource[IO, A]` гарантирует освобождение ресурсов даже при ошибках:

```scala
import cats.effect.Resource

def openFile(path: String): Resource[IO, FileHandle] =
  Resource.make(
    acquire = IO(new FileHandle(path))   // Открываем файл
  )(
    release = handle => IO(handle.close()) // Гарантированно закрываем
  )

val program: IO[String] = openFile("data.txt").use { handle =>
  IO(handle.readAll())  // Файл автоматически закроется после use
}
```

### Сравнение примитивов

| Примитив | Назначение | Аналог |
|----------|------------|--------|
| `Ref` | Мутабельное состояние | `AtomicReference` |
| `Deferred` | Одноразовая передача значения | `Promise` |
| `Semaphore` | Ограничение параллелизма | `java.util.concurrent.Semaphore` |
| `Resource` | Управление жизненным циклом | try-with-resources |

---

## Type Classes

Cats Effect организован вокруг иерархии **type classes**, каждый из которых добавляет определённые возможности.

### Базовые type classes

| Type Class | Возможности |
|------------|-------------|
| `Functor` | `map` — трансформация значения |
| `Applicative` | `pure`, `ap` — независимая композиция |
| `ApplicativeError` | Обработка ошибок |
| `Monad` | `flatMap` — последовательная композиция |

### Иерархия Cats Effect

```
                    ┌─────────┐
                    │  Monad  │
                    └────┬────┘
                         │
                    ┌────┴────┐
                    │MonadError│
                    └────┬────┘
                         │
                    ┌────┴─────┐
                    │MonadCancel│ ← Отмена + безопасность ресурсов
                    └────┬─────┘
                         │
                    ┌────┴────┐
                    │  Spawn  │ ← Fiber'ы
                    └────┬────┘
                         │
                    ┌────┴──────┐
                    │Concurrent │ ← Ref, Deferred
                    └────┬──────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
         ┌────┴────┐┌────┴────┐┌────┴────┐
         │Temporal ││  Sync   ││  Unique │
         └────┬────┘└────┬────┘└─────────┘
              │          │
              └────┬─────┘
                   │
              ┌────┴────┐
              │  Async  │ ← Полный набор возможностей
              └─────────┘
```

### Описание type classes

| Type Class | Добавляет |
|------------|-----------|
| `MonadCancel` | Отмена, безопасность ресурсов |
| `Spawn` | Создание fiber'ов |
| `Concurrent` | `Ref`, `Deferred`, параллельные комбинаторы |
| `Temporal` | Работа со временем (`sleep`, таймауты) |
| `Sync` | Синхронные побочные эффекты |
| `Async` | Асинхронные побочные эффекты, интеграция с callback API |

### Зачем нужна иерархия?

Иерархия type classes позволяет писать **абстрактный код**, который работает с любым эффектом:

```scala
import cats.effect.Concurrent
import cats.syntax.all._

// Работает с IO, но также с любым F[_], у которого есть Concurrent
def fetchAll[F[_]: Concurrent](urls: List[String])(fetch: String => F[String]): F[List[String]] =
  urls.parTraverse(fetch)
```

### Практический пример

```scala
import cats.effect.{IO, Sync}
import cats.syntax.all._

// Абстрактная функция — работает с любым F[_]: Sync
def readLine[F[_]: Sync]: F[String] =
  Sync[F].delay(scala.io.StdIn.readLine())

// Использование с IO
val program: IO[String] = readLine[IO]
```

---

## Резюме

В этой лекции мы изучили:

1. **Проблемы Future** — eager evaluation, отсутствие отмены, нарушение ссылочной прозрачности

2. **IO монада** — описание вычислений вместо их выполнения, чистота и ссылочная прозрачность

3. **Создание IO** — `IO.pure`, `IO.delay`, `IO.apply`

4. **Композиция** — `map`, `flatMap`, for comprehension

5. **Запуск IO** — `unsafeRunSync`, `IOApp`

6. **Обработка ошибок** — `raiseError`, `handleError`, `recover`, `redeem`

7. **Fibers** — легковесные потоки с поддержкой отмены

8. **Stack Safety** — трамполининг для безопасной рекурсии

9. **Базовые структуры** — `Ref`, `Deferred`, `Semaphore`, `Resource`

10. **Type Classes** — иерархия возможностей в Cats Effect

### Сравнение Future и IO

| Аспект | Future | IO |
|--------|--------|-----|
| Выполнение | Eager (сразу) | Lazy (при запуске) |
| Ссылочная прозрачность | Нет | Да |
| Отмена | Нет | Да |
| ExecutionContext | Требуется везде | Не нужен |
| Законы монад | Нарушает | Соблюдает |
| Stack safety | Частичная | Полная |

### Ключевые выводы

| Тема | Вывод |
|------|-------|
| IO vs Future | IO — чистая монада, Future — удобный, но "грязный" инструмент |
| Ленивость | IO — только описание, выполнение явно контролируется |
| Fiber vs Thread | Fiber'ы легковесны и поддерживают отмену |
| Type Classes | Позволяют писать абстрактный, переиспользуемый код |

### Ссылки

- [Cats Effect Documentation](https://typelevel.org/cats-effect/)
- [Cats Effect API](https://typelevel.org/cats-effect/api/3.x/cats/effect/IO.html)

---

[← Назад к содержанию](../index.html)
