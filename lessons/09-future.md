---
layout: page
title: Future
---

# Future

В этой лекции мы рассмотрим `Future` — основной инструмент для асинхронного программирования в стандартной библиотеке Scala. Мы изучим, как Future позволяет работать с результатами асинхронных вычислений в функциональном стиле.

## Содержание
- [Асинхронная композиция](#асинхронная-композиция)
- [Callbacks](#callbacks)
- [Future[T]](#futuret)
- [Создание Future](#создание-future)
- [Promise[T]](#promiset)
- [Композиция Future](#композиция-future)
- [Является ли Future монадой?](#является-ли-future-монадой)
- [Преимущества и недостатки Future](#преимущества-и-недостатки-future)

---

## Асинхронная композиция

### Задача: приготовить оливье

Рассмотрим задачу приготовления салата оливье как пример асинхронной композиции вычислений.

**Рецепт:**

| Ингредиент | Действия |
|------------|----------|
| Морковка | Сварить → Нарезать |
| Картошка | Сварить → Нарезать |
| Яйца | Сварить → Нарезать |
| Колбаса | Нарезать |
| Огурцы | Открыть банку |
| Горошек | Открыть банку |

**Финальный шаг:** Все ингредиенты смешать в миске с майонезом.

### Граф зависимостей

Задачи приготовления образуют **направленный ациклический граф (DAG)**:

```
    ┌──────────┐     ┌──────────┐     ┌──────────┐
    │ Сварить  │     │ Сварить  │     │ Сварить  │
    │ морковь  │     │   яйца   │     │ картошку │
    └────┬─────┘     └────┬─────┘     └────┬─────┘
         │                │                │
         ▼                ▼                ▼
    ┌──────────┐     ┌──────────┐     ┌──────────┐
    │ Нарезать │     │ Нарезать │     │ Нарезать │
    │ морковь  │     │   яйца   │     │ картошку │
    └────┬─────┘     └────┬─────┘     └────┬─────┘
         │                │                │
         └────────────────┼────────────────┘
                          │
    ┌──────────┬──────────┼──────────┬──────────┐
    │          │          │          │          │
    ▼          ▼          ▼          ▼          ▼
┌───────┐ ┌───────┐ ┌─────────┐ ┌───────┐ ┌───────┐
│Колбаса│ │Огурцы │ │ Горошек │ │Майонез│ │  ...  │
└───┬───┘ └───┬───┘ └────┬────┘ └───┬───┘ └───┬───┘
    │         │          │          │         │
    └─────────┴──────────┼──────────┴─────────┘
                         ▼
                   ┌───────────┐
                   │   Салат   │
                   └───────────┘
```

### Что мы видим в этом графе?

1. **Независимые операции** — варку морковки, яиц и картошки можно выполнять **параллельно**
2. **Зависимые операции** — нарезать можно только **после** варки
3. **Финальная сборка** — смешивание возможно только когда **все** ингредиенты готовы

Это и есть суть **асинхронной композиции**: некоторые задачи можно выполнять параллельно, но некоторые зависят от результатов других.

### Как выразить это в коде?

Нам нужен способ:
1. Запускать операции асинхронно
2. Выражать зависимости между операциями
3. Комбинировать результаты

Именно для этого и существует `Future`.

---

## Callbacks

Прежде чем перейти к Future, рассмотрим более примитивный подход — **колбэки**.

### Что такое Callback?

**Callback** — это функция, которая передаётся в качестве аргумента другой функции и вызывается после завершения операции.

```scala
def asyncOperation(input: String, onComplete: String => Unit): Unit = {
  // Асинхронно выполняем операцию
  // Когда готово — вызываем колбэк с результатом
  onComplete(result)
}
```

### Пример с колбэками

```scala
def boilCarrots(onComplete: Carrots => Unit): Unit
def chopCarrots(carrots: Carrots, onComplete: ChoppedCarrots => Unit): Unit

// Использование
boilCarrots { carrots =>
  chopCarrots(carrots, { choppedCarrots =>
    // Делаем что-то с нарезанной морковкой
  })
}
```

### Проблема 1: Callback Hell

При множестве зависимых операций код превращается в **"пирамиду смерти"**:

```scala
loadConfig { config =>
  connectToDatabase(config) { db =>
    fetchUser(db, userId) { user =>
      fetchPermissions(db, user) { permissions =>
        fetchData(db, user, permissions) { data =>
          processData(data) { result =>
            saveResult(db, result) { _ =>
              sendNotification(user) { _ =>
                // Наконец-то можно что-то сделать!
              }
            }
          }
        }
      }
    }
  }
}
```

**Проблемы:**
- Код нечитаемый — глубокая вложенность
- Сложно отслеживать поток выполнения
- Трудно обрабатывать ошибки
- Невозможно переиспользовать части логики

### Проблема 2: Stack Overflow

При глубоких рекурсивных вызовах колбэков можно получить переполнение стека:

```scala
def processItems(items: List[Item], onComplete: () => Unit): Unit = {
  items match {
    case Nil => onComplete()
    case head :: tail =>
      processItem(head) { _ =>
        processItems(tail, onComplete)  // Рекурсивный вызов в колбэке!
      }
  }
}
```

Каждый вызов колбэка добавляет новый фрейм в стек. При большом количестве элементов — Stack Overflow.

### Итоги по Callbacks

| Проблема | Описание |
|----------|----------|
| Callback Hell | Код превращается в нечитаемую "пирамиду" |
| Stack Overflow | Риск переполнения стека при глубокой рекурсии |
| Обработка ошибок | Нет стандартного способа передавать ошибки |
| Композиция | Сложно комбинировать и переиспользовать |

Нужен более удобный инструмент — и это `Future`.

---

## Future[T]

### Определение

`Future[T]` — это тип, представляющий **вычисление, которое когда-нибудь завершится** и вернёт значение типа `T` (или ошибку).

```scala
import scala.concurrent.Future
```

### Что может быть внутри Future?

| Состояние | Описание |
|-----------|----------|
| **Не завершён** | Вычисление ещё выполняется |
| **Успех** | Вычисление завершилось, содержит значение типа `T` |
| **Ошибка** | Вычисление завершилось с исключением |

### Аналогия

`Future[T]` можно представить как **контейнер для значения, которое появится в будущем**:

```
Время ──────────────────────────────────────────▶

Future[Int]:
   ┌─────────┐         ┌─────────┐
   │ Пустой  │  ────▶  │   42    │
   │   ???   │         │ Success │
   └─────────┘         └─────────┘
     сейчас              потом
```

### Future как коллекция

Можно думать о `Future[T]` как о **коллекции из 0 или 1 элемента**, который появится в будущем:

- `List[T]` — 0, 1 или много элементов **сейчас**
- `Option[T]` — 0 или 1 элемент **сейчас**
- `Future[T]` — 0 или 1 элемент **в будущем**

---

## Создание Future

### Создание уже завершённого Future

Если результат уже известен, можно создать завершённый Future:

```scala
import scala.concurrent.Future

// Успешно завершённый Future
val successful: Future[Int] = Future.successful(42)

// Future с ошибкой
val failed: Future[Int] = Future.failed(new RuntimeException("Oops!"))
```

**Важно:** Эти Future создаются **мгновенно** и уже содержат результат.

### Создание Future с вычислением

Для запуска асинхронного вычисления используется `Future.apply`:

```scala
import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

val futureResult: Future[Int] = Future {
  // Этот код выполняется асинхронно в другом потоке
  Thread.sleep(1000)
  42
}
```

### ExecutionContext

`Future.apply` требует **неявный** `ExecutionContext`:

```scala
def apply[T](body: => T)(implicit executor: ExecutionContext): Future[T]
```

`ExecutionContext` определяет, **где** будет выполняться вычисление (на каком пуле потоков).

```scala
import scala.concurrent.ExecutionContext.Implicits.global  // стандартный EC

// Или явно
implicit val ec: ExecutionContext = ExecutionContext.global

val future = Future {
  computeSomething()
}
```

### Пример: асинхронная загрузка данных

```scala
import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

def fetchUser(id: Long): Future[User] = Future {
  // Выполняется асинхронно
  httpClient.get(s"/users/$id")
}

def fetchOrders(userId: Long): Future[List[Order]] = Future {
  // Выполняется асинхронно
  httpClient.get(s"/users/$userId/orders")
}

// Оба запроса запускаются сразу!
val userFuture = fetchUser(42)
val ordersFuture = fetchOrders(42)
```

---

## Promise[T]

### Что если результат придёт извне?

Иногда мы не создаём вычисление сами, а ждём результат от внешнего источника:
- Ответ от колбэк-based API
- Результат от внешней системы
- Событие от пользователя

### Promise — "другая сторона" Future

`Promise[T]` — это **мутабельный контейнер**, который позволяет вручную завершить Future.

```scala
import scala.concurrent.Promise

val promise: Promise[Int] = Promise[Int]()

// Получаем связанный Future
val future: Future[Int] = promise.future

// Позже, когда результат готов:
promise.success(42)       // Завершить успехом
// или
promise.failure(new Exception("Error"))  // Завершить ошибкой
```

### Связь Promise и Future

```
     Promise[T]                    Future[T]
    ┌───────────┐                ┌───────────┐
    │           │    .future     │           │
    │  success  │ ─────────────▶ │   value   │
    │  failure  │                │           │
    └───────────┘                └───────────┘
       Запись                       Чтение
    (один раз!)                  (много раз)
```

- `Promise` — для **записи** результата (можно сделать только один раз)
- `Future` — для **чтения** результата (можно читать многократно)

### Пример: адаптация колбэк API

```scala
def callbackBasedApi(input: String, callback: String => Unit): Unit = ???

def wrapWithFuture(input: String): Future[String] = {
  val promise = Promise[String]()

  callbackBasedApi(input, result => {
    promise.success(result)  // Завершаем Future, когда колбэк вызван
  })

  promise.future  // Возвращаем Future сразу
}
```

### Пример: горошек для оливье

```scala
// Кто-то забыл купить горошек...
// Но мы можем подождать, пока его принесут!

val peasPromise = Promise[Peas]()
val peasFuture: Future[Peas] = peasPromise.future

// Где-то в другом месте, когда горошек доставлен:
def onPeasDelivered(peas: Peas): Unit = {
  peasPromise.success(peas)
}

// Теперь peasFuture завершится, когда горошек доставят
```

---

## Композиция Future

Главное преимущество Future над колбэками — **функциональная композиция**.

### map: трансформация результата

```scala
def map[S](f: T => S)(implicit executor: ExecutionContext): Future[S]
```

`map` применяет функцию к результату Future, когда он будет готов:

```scala
val futureInt: Future[Int] = Future(42)
val futureString: Future[String] = futureInt.map(n => s"Result: $n")
// futureString завершится со значением "Result: 42"
```

### flatMap: последовательная композиция

```scala
def flatMap[S](f: T => Future[S])(implicit executor: ExecutionContext): Future[S]
```

`flatMap` позволяет строить **цепочки зависимых** асинхронных операций:

```scala
def fetchUser(id: Long): Future[User] = ???
def fetchOrders(user: User): Future[List[Order]] = ???

val orders: Future[List[Order]] =
  fetchUser(42).flatMap(user => fetchOrders(user))
```

### For comprehension

Благодаря `map` и `flatMap`, Future поддерживает **for comprehension**:

```scala
// Вложенные flatMap
val result = fetchUser(42).flatMap { user =>
  fetchOrders(user).flatMap { orders =>
    calculateTotal(orders).map { total =>
      (user, orders, total)
    }
  }
}

// Эквивалентный for comprehension
val result = for {
  user   <- fetchUser(42)
  orders <- fetchOrders(user)
  total  <- calculateTotal(orders)
} yield (user, orders, total)
```

### Параллельная композиция

Для **независимых** операций можно запустить Future параллельно:

```scala
// Запускаем ДО for comprehension — выполняются параллельно!
val userFuture = fetchUser(42)
val configFuture = fetchConfig()

val result = for {
  user   <- userFuture    // Уже запущен
  config <- configFuture  // Уже запущен
} yield (user, config)
```

**Важно:** Future начинает выполняться **сразу при создании** (eager evaluation).

### sequence и traverse

Для работы с коллекциями Future:

```scala
import scala.concurrent.Future

val futures: List[Future[Int]] = List(Future(1), Future(2), Future(3))

// sequence: List[Future[A]] => Future[List[A]]
val combined: Future[List[Int]] = Future.sequence(futures)
// combined завершится с List(1, 2, 3)

// traverse: List[A] => (A => Future[B]) => Future[List[B]]
val ids = List(1L, 2L, 3L)
val users: Future[List[User]] = Future.traverse(ids)(fetchUser)
```

### zip: объединение двух Future

```scala
val future1: Future[Int] = Future(1)
val future2: Future[String] = Future("hello")

val combined: Future[(Int, String)] = future1.zip(future2)
// combined завершится с (1, "hello")
```

### Обработка ошибок

```scala
// recover: обработать ошибку, вернув значение
val safe: Future[Int] = riskyOperation.recover {
  case _: TimeoutException => 0
  case _: IOException => -1
}

// recoverWith: обработать ошибку, вернув другой Future
val retried: Future[Int] = riskyOperation.recoverWith {
  case _: TimeoutException => riskyOperation  // повторить
}

// fallbackTo: использовать альтернативный Future при ошибке
val withFallback: Future[Int] = primaryOperation.fallbackTo(backupOperation)
```

### transform и transformWith

Более мощные методы для работы с обоими исходами:

```scala
// transform: обработать и успех, и ошибку
def transform[S](s: T => S, f: Throwable => Throwable)
                (implicit executor: ExecutionContext): Future[S]

// transformWith: полный контроль через Try
def transformWith[S](f: Try[T] => Future[S])
                    (implicit executor: ExecutionContext): Future[S]
```

Пример:

```scala
val result = riskyOperation.transformWith {
  case Success(value) => Future.successful(s"Got: $value")
  case Failure(ex)    => Future.successful(s"Error: ${ex.getMessage}")
}
```

---

## Является ли Future монадой?

### Формальный ответ: нет

Несмотря на наличие `map` и `flatMap`, `Future` **не является монадой** в строгом смысле, потому что нарушает законы монад.

### Проблема 1: Eager evaluation

Future начинает выполняться **сразу** при создании:

```scala
val future = Future {
  println("Side effect!")
  42
}
// "Side effect!" выводится немедленно, даже если мы не используем future!
```

Это нарушает **левую идентичность**:

```scala
// Должно быть эквивалентно:
Future(a).flatMap(f) == f(a)

// Но на самом деле:
// Левая часть запускает вычисление сразу
// Правая часть — только когда вызвана f(a)
```

### Проблема 2: Отсутствие ссылочной прозрачности

```scala
// Эти два выражения НЕ эквивалентны:

// Вариант 1: Future создаётся один раз
val f = Future { println("hello"); 42 }
for {
  a <- f
  b <- f
} yield a + b
// Выводит "hello" ОДИН раз

// Вариант 2: Future создаётся дважды
for {
  a <- Future { println("hello"); 42 }
  b <- Future { println("hello"); 42 }
} yield a + b
// Выводит "hello" ДВА раза
```

### Проблема 3: Зависимость от ExecutionContext

Результат `flatMap` может зависеть от того, какой `ExecutionContext` используется:

```scala
implicit val ec1: ExecutionContext = ???
implicit val ec2: ExecutionContext = ???

// Поведение может отличаться в зависимости от EC
future.flatMap(f)(ec1) vs future.flatMap(f)(ec2)
```

### Сводная таблица нарушений

| Закон монады | Нарушение в Future |
|--------------|-------------------|
| Левая идентичность | Eager evaluation — побочные эффекты выполняются сразу |
| Правая идентичность | Отсутствие ссылочной прозрачности |
| Ассоциативность | Зависимость от ExecutionContext |

### Практический вывод

Future **не является монадой**, но это не делает его бесполезным. Просто нужно понимать его ограничения и использовать его осознанно.

Для "честной" монадической работы с асинхронностью существует `IO` (рассмотрим в следующей лекции).

---

## Преимущества и недостатки Future

### Преимущества над колбэками

| Преимущество | Описание |
|--------------|----------|
| Читаемый синтаксис | For comprehension вместо вложенных колбэков |
| Stack safety | Не переполняет стек при глубоких цепочках |
| Функциональная композиция | `map`, `flatMap`, `recover` и другие комбинаторы |
| Стандартная обработка ошибок | Ошибки автоматически пробрасываются по цепочке |

### Недостатки Future

| Недостаток | Описание |
|------------|----------|
| Требует ExecutionContext | Нужно везде передавать EC (явно или неявно) |
| Нет отмены | Невозможно отменить запущенное вычисление |
| Eager evaluation | Вычисление запускается сразу при создании |
| Не ссылочно прозрачен | Нарушает принципы ФП |
| Мемоизация | Результат кэшируется — повторный flatMap не перезапускает вычисление |

### Блокирующее ожидание: Await

Иногда нужно дождаться результата синхронно:

```scala
import scala.concurrent.Await
import scala.concurrent.duration._

val future: Future[Int] = Future(42)

// Блокирует текущий поток до завершения Future
val result: Int = Await.result(future, 5.seconds)
```

**Когда использовать:**
- В тестах
- В main-методе
- При интеграции с синхронным кодом

**Избегать:**
- В production-коде с высокой нагрузкой
- В асинхронных обработчиках
- Везде, где важна производительность

---

## Резюме

В этой лекции мы изучили:

1. **Асинхронная композиция** — способ организации зависимых и независимых асинхронных операций

2. **Callbacks** — примитивный подход с серьёзными проблемами (callback hell, stack overflow)

3. **Future[T]** — тип для представления асинхронных вычислений

4. **Создание Future** — через `Future.apply`, `Future.successful`, `Future.failed`

5. **Promise[T]** — мутабельный контейнер для ручного завершения Future

6. **Композиция Future** — `map`, `flatMap`, `recover`, `sequence`, `traverse`

7. **Future не монада** — нарушает законы из-за eager evaluation и отсутствия ссылочной прозрачности

### Ключевые выводы

| Тема | Вывод |
|------|-------|
| Future vs Callbacks | Future значительно удобнее и безопаснее |
| ExecutionContext | Необходим для всех операций с Future |
| Eager evaluation | Future запускается сразу — это и плюс, и минус |
| Ограничения | Нет отмены, не монада, не ссылочно прозрачен |

### Что дальше?

В следующей лекции мы рассмотрим **монаду IO** — подход к асинхронности, который решает проблемы Future:
- Ленивое выполнение (lazy)
- Ссылочная прозрачность
- Отмена вычислений
- Честное соблюдение законов монад

---

[← Назад к содержанию](../index.html)
