---
layout: page
title: Классические тайпклассы
---

# Классические тайпклассы

На прошлой лекции мы рассматривали такие механизмы языка как имплиситы и тайпклассы. Сегодня мы перейдём к рассмотрению базовых абстракций из функционального программирования, которые используются Scala-разработчиками в повседневной работе.

## Содержание
- [Semigroup и Monoid](#semigroup-и-monoid)
- [Functor](#functor)
- [Foldable](#foldable)
- [Applicative](#applicative)
- [Traverse](#traverse)
- [FlatMap](#flatmap)
- [ApplicativeError](#applicativeerror)
- [Законы тайпклассов](#законы-тайпклассов)
- [Библиотека Cats](#библиотека-cats)

---

## Semigroup и Monoid

Начнём с самых простых для понимания абстракций. Это так называемые **Appendable Things** — типы данных или структуры, которые могут быть объединены или "добавлены" друг к другу с помощью определённой операции.

### Semigroup

**Semigroup** — это тайпкласс, который представляет собой операцию, которая может комбинировать два объекта одного типа.

```scala
trait Semigroup[A] {
  def combine(x: A, y: A): A
}

Semigroup[Int].combine(1, 2) // 3
```

Метод `combine` также выражают следующим синтаксисом:

```scala
object SemigroupSyntax {
  implicit class SemigroupOps[A](private val a: A) extends AnyVal {
    def |+|(b: A)(implicit s: Semigroup[A]): A = s.combine(a, b)
  }
}

// Синтаксис позволяет писать такой код
1 |+| 2 |+| 3
```

### Примеры инстансов Semigroup

Простые примеры `Semigroup` для сложения чисел, строк и списков:

```scala
implicit val semigroupInt: Semigroup[Int] = new Semigroup[Int] {
  override def combine(x: Int, y: Int): Int = x + y
}

implicit val semigroupString: Semigroup[String] = new Semigroup[String] {
  override def combine(x: String, y: String): String = x + y
}

implicit def semigroupList[A]: Semigroup[List[A]] = new Semigroup[List[A]] {
  override def combine(x: List[A], y: List[A]): List[A] = x ::: y
}
```

Примеры использования:

```scala
1 |+| 2 |+| 3
// result: 6

val resultForStrings = "Hello" |+| " " |+| "world!"
// result: Hello world!

List(1, 2) |+| List(3, 4) |+| Nil
// result: List(1, 2, 3, 4)
```

### Свойства Semigroup

Важнейшей особенностью `Semigroup` является **ассоциативность**. Это значит, что порядок, в котором происходит комбинирование, не важен:

| Свойство | Закон |
|----------|-------|
| Ассоциативность | `(A |+| B) |+| C = A |+| (B |+| C)` |

- `Semigroup` полезен, когда вам нужно комбинировать или суммировать данные разных элементов. Он предоставляет формальный способ сделать это, который гарантирует соблюдение ассоциативности.
- В программировании это особенно важно для работы с коллекциями данных, распределёнными системами и параллельными вычислениями, где порядок операций может меняться.

Ассоциативность находит практическое применение в том, что она позволяет разбивать задачи на меньшие подзадачи, которые могут быть выполнены независимо и, часто, параллельно. Это принципиально важно для увеличения эффективности вычислений в современных высокопроизводительных и распределённых системах.

Допустим, операция вычитания — это пример, когда ассоциативность не выполняется:

```scala
(1 - 2) - 3
// res14: Int = -4

1 - (2 - 3)
// res15: Int = 2
```

### Monoid

**Monoid** — это полугруппа с нейтральным элементом. `Monoid` расширяет `Semigroup`, добавляя понятие нейтрального элемента (`empty`). Этот элемент действует как "нулевой" элемент для операции `combine`.

```scala
trait Monoid[A] extends Semigroup[A] {
  def empty: A
}
```

Практическая польза нейтрального элемента выражается в сценариях, когда, например, мы можем попытаться найти сумму значений в списке, который может быть пустым. В этом случае `Monoid[A].empty` будет служить разумным и безопасным значением по умолчанию.

```scala
def combineAll[A: Monoid](as: List[A]): A = {
  as.foldLeft(Monoid[A].empty)(Monoid[A].combine)
}

combineAll(List(1, 2, 3))
// result: Int = 6

combineAll(List[Int]())
// result: Int = 0
```

### Свойства Monoid

| Свойство | Закон |
|----------|-------|
| Ассоциативность | `(A |+| B) |+| C = A |+| (B |+| C)` |
| Левая идентичность | `Monoid[A].empty |+| x = x` |
| Правая идентичность | `x |+| Monoid[A].empty = x` |

Свойства identity гарантируют, что идентичный элемент действительно нейтрален и не вносит никаких изменений в другие элементы моноида при выполнении операции. Это обеспечивает предсказуемость в использовании моноидов для различных вычислительных задач, таких как свёртка коллекций, агрегация данных, функциональное составление и т.д.

---

## Functor

Следующий тайпкласс, который мы рассмотрим — это функтор (или Covariant Functor).

```scala
trait Functor[F[_]] {
  def map[A, B](fa: F[A])(f: A => B): F[B]
}
```

**Functor** — это абстракция, которая позволяет описывать последовательные вычисления для значений внутри некоторого контекста `F[_]`.

### Типы высших порядков (Higher-Kinded Types)

Давайте подробнее остановимся на `F[_]` — что оно означает?

Вы уже знакомы с такими типами как `Seq`, `List`, `Option` (их гораздо больше), которые могут содержать в себе некоторые значения. В Scala концепция `F[_]` используется для обозначения **типов высших порядков (Higher-Kinded Types, HKT)**.

Типы высших порядков — это типы, которые принимают другие типы в качестве параметров. Они позволяют абстрагироваться не только над конкретными типами, но и над конструкциями типов, такими как коллекции, опциональные значения, эффекты и т.д.

Примеры `F[_]`:
- `List[_]`: здесь `List` является типом высшего порядка, который принимает один типовой параметр (например, `List[Int]`, `List[String]`).
- `Option[_]`: аналогично, `Option` принимает один типовой параметр, создавая такие типы как `Option[Int]` или `Option[YourCustomType]`.

Использование `F[_]` позволяет делать абстракции, не привязываясь к конкретной реализации. `F[_]` ещё обычно называют "F с дыркой".

### Операция map

| Тайпкласс | Метод | Из | Дано | В |
|-----------|-------|-----|------|---|
| `Functor` | `map` | `F[A]` | `A => B` | `F[B]` |

Основная идея `Functor` заключается в возможности применения функции к значениям, находящимся в некотором контексте (например, в контейнере или эффекте), без необходимости извлекать эти значения из их контекста.

Основная операция в `Functor` — это `map`, которая принимает функцию `f: A => B` и применяет её к значению типа `A`, находящемуся в контексте `F[A]`, результатом чего является значение типа `B` в том же контексте `F[B]`. Это позволяет трансформировать данные в контейнерах или других контекстах, не заботясь о деталях реализации этих контекстов.

### Примеры инстансов Functor

Давайте напишем инстансы функтора для `Option` и `List`:

```scala
object FunctorInstances {

  implicit val optionFunctor: Functor[Option] = new Functor[Option] {
    override def map[A, B](fa: Option[A])(f: A => B): Option[B] = {
      fa match {
        case Some(value) => Some(f(value))
        case None => None
      }
    }
  }

  implicit val listFunctor: Functor[List] = new Functor[List] {
    override def map[A, B](fa: List[A])(f: A => B): List[B] = {
      fa.map(f)
    }
  }
}
```

Синтаксис для Functor:

```scala
object FunctorSyntax {
  implicit class FunctorOps[F[_], A](private val fa: F[A]) extends AnyVal {
    def map[B](f: A => B)(implicit functor: Functor[F]): F[B] =
      functor.map[A, B](fa)(f)
  }
}

// Чтобы можно было делать
fa.map(a => a.toString)
```

Примеры использования:

```scala
import FunctorInstances._
import FunctorSyntax._

List(1, 2, 3).map(_ + 1) // result: List(2, 3, 4)

Some(1).map(_ + 1) // result: Some(2)
```

### Пример с абстрактным F[_]

Пример использования посложнее. Тут мы выполняем цепочку вычислений с некоторым `F[_]`:

```scala
import FunctorInstances._
import FunctorSyntax._

def checkMeaningOfLife(num: Int): String = {
  if (num == 42) s"$num is meaning of life"
  else s"$num isn't meaning of life"
}

def functorUsingExample[F[_]: Functor](numF: F[Int]): F[String] = {
  numF
    .map(checkMeaningOfLife)
    .map(_.toUpperCase)
    .map(_ + "!")
}

functorUsingExample(Some(42)) // result: Some(42 IS MEANING OF LIFE!)
functorUsingExample(None)     // result: None

functorUsingExample(List(1, 2, 42))
// result: List(
//   1 ISN'T MEANING OF LIFE!,
//   2 ISN'T MEANING OF LIFE!,
//   42 IS MEANING OF LIFE!
// )
```

Самое интересное в этом примере — это кусок кода с последовательностью вычислений с `map`. Есть какой-то абстрактный `F[Int]`, который может быть чем угодно (список, опшин или что-то ещё), нам на самом деле не важно. Мы лишь выполняем вычисления для значения внутри него.

### Законы Functor

#### Identity (Идентичность)

Применение функции `identity` (т.е., функции, которая возвращает свой аргумент без изменений) через `map` к контексту не должно изменять этот контекст.

```scala
fa.map(a => a) == fa

// или
def identity(a: A): A = a
fa.map(identity) == fa
```

#### Composition (Композиция)

Применение двух функций последовательно через два последовательных вызова `map` должно быть эквивалентно одному вызову `map` с композицией этих двух функций.

```scala
fa.map(g(f(_))) == fa.map(f).map(g)
```

Свойство композиции позволяет разрабатывать модульный и выразительный код. Вы можете создавать мелкие, независимые функции и комбинировать их в более сложные операции. Это облегчает тестирование, поскольку каждую функцию можно тестировать отдельно, а затем компоновать с гарантией, что их композиция будет работать корректно.

---

## Foldable

```scala
trait Foldable[F[_]] {
  def foldLeft[A, B](fa: F[A], b: B)(f: (B, A) => B): B
  def foldRight[A, B](fa: F[A], lb: Eval[B])(f: (A, Eval[B]) => Eval[B]): Eval[B]
}
```

**Foldable** — это тайпкласс или абстракция над операцией "свёртки" коллекций и других структур данных к одному значению. Свёртка — это процесс итерации по элементам структуры данных с целью сокращения их к единственному суммарному значению, часто используя некоторую комбинирующую операцию, такую как сложение, умножение или логическое "И"/"ИЛИ".

- `foldLeft` проходит структуру данных слева направо и использует функцию `f` для комбинирования каждого элемента с аккумулированным значением.
- `foldRight` проходит структуру данных справа налево. Использование `Eval[B]` обеспечивает возможность ленивой обработки и поддержку бесконечных структур данных.

### Пример использования

```scala
val numbers = List(1, 2, 3, 4, 5)
val sum = Foldable[List].foldLeft(numbers, 0)(_ + _)
// result: 15
```

---

## Applicative

### Applicative.pure

Мы научились делать вычисления над значениями, которые лежат в некотором контексте `F[_]`. Но есть один вопрос — как засовывать значения в этот самый контекст?

У всех типов `List`, `Option`, `Either` (и другие) есть различные способы для оборачивания значений в их контекст. Хотелось бы иметь абстракцию, которая умеет помещать значение в контекст. И этой абстракцией как раз таки является **Applicative**.

```scala
trait Applicative[F[_]] extends Functor[F] {
  def pure[A](a: A): F[A]
}
```

`Applicative` — это тайпкласс, который расширяет `Functor` путём добавления операции `pure`.

Операция `pure` принимает значение и помещает его в контекст `F[_]`. Это позволяет начать работу с "чистыми" значениями в контексте `F[_]`, что является основой для дальнейших операций применения функций в этом контексте.

### Примеры с pure

Давайте создадим инстансы аппликатива для Option и List:

```scala
object ApplicativeInstances {

  implicit val optionApplicative: Applicative[Option] = new Applicative[Option] {
    override def pure[A](a: A): Option[A] = Some(a)

    override def map[A, B](fa: Option[A])(f: A => B): Option[B] = fa.map(f)
  }

  implicit val listApplicative: Applicative[List] = new Applicative[List] {
    override def pure[A](a: A): List[A] = a :: Nil

    override def map[A, B](fa: List[A])(f: A => B): List[B] = fa.map(f)
  }
}
```

Определим синтаксис:

```scala
object ApplicativeSyntax {

  implicit class ApplicativeOps[A](private val a: A) extends AnyVal {
    def pure[F[_]](implicit applicative: Applicative[F]): F[A] = applicative.pure(a)
  }
}

// Чтобы можно было делать
42.pure[Option]
```

Примеры:

```scala
import ApplicativeSyntax._
import ApplicativeInstances._

42.pure[Option]    // result: Some(42)
"Hello".pure[List] // result: List("Hello")
```

### Applicative.product

```scala
trait Applicative[F[_]] extends Functor[F] {
  def pure[A](a: A): F[A]
  def product[A, B](fa: F[A], fb: F[B]): F[(A, B)]
}
```

`Applicative.product` берёт два контекста и комбинирует их значения в пару. Например, если у вас есть `F[Int]` и `F[String]`, то `product` сделает `F[(Int, String)]`. При этом он не применяет никаких функций к значениям этих контекстов.

| Тайпкласс | Метод | Из | В |
|-----------|-------|-----|---|
| `Applicative` | `pure` | `A` | `F[A]` |
| `Applicative` | `product` | `(F[A], F[B])` | `F[(A, B)]` |

Пример `product` для `Option`:

```scala
override def product[A, B](fa: Option[A], fb: Option[B]): Option[(A, B)] = {
  (fa, fb) match {
    case (Some(a), Some(b)) => Some((a, b))
    case _ => None
  }
}
```

Пример использования:

```scala
import ApplicativeInstances._

val firstOption = Some(42)
val secondOption = Some("Hello")

println(Applicative[Option].product(firstOption, secondOption)) // result: Some((42, Hello))
println(Applicative[Option].product(firstOption, None)) // None
```

В некоторых реализациях `product` может использоваться для указания, что два вычисления могут быть выполнены параллельно, поскольку они не зависят друг от друга.

### Applicative.mapN

На основе `product` можно построить метод `mapN`, который позволяет применить функцию к значениям нескольких независимых контекстов:

```scala
// Синтаксис для mapN
(option1, option2, option3).mapN { (a, b, c) =>
  s"$a - $b - $c"
}
```

Пример:

```scala
val name: Option[String] = Some("Alice")
val age: Option[Int] = Some(25)
val city: Option[String] = Some("Moscow")

(name, age, city).mapN { (n, a, c) =>
  s"$n, $a years old, lives in $c"
}
// result: Some("Alice, 25 years old, lives in Moscow")

// Если хотя бы одно значение None:
(name, None, city).mapN { (n, a, c) =>
  s"$n, $a years old, lives in $c"
}
// result: None
```

### Законы Applicative

| Свойство | Закон |
|----------|-------|
| Ассоциативность | `fa.product(fb).product(fc) ~ fa.product(fb.product(fc))` |
| Левая идентичность | `().pure.product(fa) ~ fa` |
| Правая идентичность | `fa.product(().pure) ~ fa` |

---

## Traverse

```scala
trait Traverse[F[_]] {
  def traverse[G[_]: Applicative, A, B](fa: F[A])(f: A => G[B]): G[F[B]]
}
```

`traverse` принимает структуру данных `F[A]` и функцию `f: A => G[B]`, где `G[_]` — это некоторый аппликативный функтор. Задача `traverse` — применить `f` к каждому элементу `A` в структуре `F`, а затем собрать результаты обратно в `F[B]`, сохраняя при этом эффекты и структуру контекста `G`.

| Тайпкласс | Метод | Из | Дано | В |
|-----------|-------|-----|------|---|
| `Traverse` | `traverse` | `F[A]` | `A => G[B]` | `G[F[B]]` |

### Метод sequence

Метод `sequence` является частью тайпкласса `Traverse` и позволяет "инвертировать" структуру, содержащую контекстуализированные значения, например, из `List[Option[A]]` в `Option[List[A]]`. Это удобно, когда вам нужно выполнить множество операций, каждая из которых может вернуть значение в контексте, и вы хотите собрать результаты в один контекст, содержащий коллекцию результатов.

```scala
implicit class SequenceOps[F[_], G[_], A](private val gfa: G[F[A]]) extends AnyVal {
  // gfa.sequence
  def sequence(implicit applicative: Applicative[F], traverse: Traverse[G]): F[G[A]] =
    traverse.traverse(gfa)(identity)
}
```

### Примеры инстансов Traverse

```scala
// Инстанс Traverse для List
implicit val listTraverse: Traverse[List] = new Traverse[List] {
  def traverse[G[_]: Applicative, A, B](fa: List[A])(f: A => G[B]): G[List[B]] =
    fa.foldLeft(List.empty[B].pure[G])((accF, next) =>
      accF.product(f(next)).map { case (acc, next) => acc.appended(next) }
    )
}

// Инстанс для Option
implicit val optionTraverse: Traverse[Option] = new Traverse[Option] {
  def traverse[G[_]: Applicative, A, B](fa: Option[A])(f: A => G[B]): G[Option[B]] =
    fa match {
      case Some(value) => f(value).map(Some(_))
      case None => Option.empty[B].pure[G]
    }
}
```

### Примеры использования

```scala
// Использование Traverse для преобразования List[Option[Int]] в Option[List[Int]]
val listOfOptions: List[Option[Int]] = List(Some(1), Some(2), Some(3))

val optionOfList: Option[List[Int]] = Traverse[List].traverse(listOfOptions)(identity)
// result: Some(List(1, 2, 3))

val listWithNone: List[Option[Int]] = List(Some(1), None, Some(3))
val resultWithNone: Option[List[Int]] = Traverse[List].traverse(listWithNone)(identity)
// result: None
```

```scala
def getTag(id: Int): Option[String] = {
  if (id < 5) Some("Less")
  else if (id > 7) Some("Greater")
  else None
}

List(1, 2, 3, 4, 8).traverse(getTag) // Some(List(Less, Less, Less, Less, Greater))

Option(1).traverse(getTag) // Some(Some(Less))

Option(8).traverse(getTag) // Some(Some(Greater))

Option.empty[Int].traverse(getTag) // Some(None)
```

---

## FlatMap

Тайпкласс `FlatMap` представляет собой абстракцию, позволяющую выполнять последовательные вычисления, где результат одного вычисления используется для определения следующего. Это расширение тайпкласса `Functor`, добавляющее к нему метод `flatMap`.

```scala
trait FlatMap[F[_]] extends Functor[F] {
  def flatMap[A, B](fa: F[A])(func: A => F[B]): F[B]
}
```

Основной операцией в `FlatMap` является метод `flatMap`, который принимает значение в контексте `F[A]` и функцию `f: A => F[B]`, и возвращает новое значение в контексте `F[B]`.

| Тайпкласс | Метод | Из | Дано | В |
|-----------|-------|-----|------|---|
| `Functor` | `map` | `F[A]` | `A => B` | `F[B]` |
| `FlatMap` | `flatMap` | `F[A]` | `A => F[B]` | `F[B]` |

### Примеры использования FlatMap

В данном примере операции `findUserById` и `findProfileByUser` образуют последовательные вычисления через комбинатор `flatMap`:

```scala
import FlatMapSyntax._
import FunctorSyntax._

def findUserById[F[_]](id: UserId): F[User] = ???
def findProfileByUser[F[_]](user: User): F[Profile] = ???
def getProfileSettings[F[_]](profile: Profile): F[ProfileSettings] = ???

def profileSettingsByUserId[F[_]: FlatMap](id: UserId): F[ProfileSettings] = {
  findUserById[F](id)
    .flatMap(user => findProfileByUser[F](user))
    .flatMap(profile => getProfileSettings[F](profile))
}

profileSettingsByUserId[Option](UserId(73)) // Option[ProfileSettings]
```

### For Comprehensions

Функцию `profileSettingsByUserId` мы также можем переписать через так называемый **For Comprehensions** — это синтаксический сахар, который позволяет выражать последовательные вычисления более читаемым способом.

```scala
def findUserById[F[_]](id: UserId): F[User] = ???
def findProfileByUser[F[_]](user: User): F[Profile] = ???
def getProfileSettings[F[_]](profile: Profile): F[ProfileSettings] = ???

def profileSettingsByUserId[F[_]: FlatMap: Functor](id: UserId): F[ProfileSettings] = {
  for {
    user            <- findUserById[F](id)
    profile         <- findProfileByUser[F](user)
    profileSettings <- getProfileSettings[F](profile)
  } yield profileSettings
}
```

### Свойства FlatMap

У FlatMap одно свойство — это ассоциативность:

```scala
fa.flatMap(f).flatMap(g) == fa.flatMap(a => f(a).flatMap(g))
```

Это свойство ассоциативности гарантирует, что вы можете строить сложные вычислительные цепочки из `flatMap` операций без беспокойства о том, как они группируются, что значительно упрощает рассуждения о коде.

---

## ApplicativeError

Мы научились строить цепочки вычислений, но есть один момент, который мы пока не учли — что делать, если в процессе вычислений произойдёт ошибка?

```scala
trait ApplicativeError[F[_], E] extends Applicative[F] {

  def raiseError[A](e: E): F[A]

  def handleErrorWith[A](fa: F[A])(f: E => F[A]): F[A]
}
```

`ApplicativeError` — это расширение абстракции `Applicative`, предоставляющее возможности для обработки ошибок. `ApplicativeError` добавляет механизмы для представления и обработки потенциальных ошибок в этих контекстах.

### Основные операции ApplicativeError

- `raiseError[A](e: E): F[A]` — создаёт значение в контексте `F[A]`, представляющее ошибку типа `E`. Это позволяет возвращать ошибки в том же контексте, что и обычные значения.
- `handleErrorWith[A](fa: F[A])(f: E => F[A]): F[A]` — позволяет обрабатывать ошибки, предоставляя функцию для их преобразования в новый контекст `F[A]`.

### Примеры с ApplicativeError

Инстанс для Either:

```scala
object ApplicativeErrorInstances {
  implicit def either[E]: ApplicativeError[Either[E, *], E] = new ApplicativeError[Either[E, *], E] {

    override def raiseError[A](e: E): Either[E, A] = Left(e)

    override def handleErrorWith[A](fa: Either[E, A])(f: E => Either[E, A]): Either[E, A] = {
      fa match {
        case Left(error) => f(error)
        case right => right
      }
    }

    override def pure[A](a: A): Either[E, A] = Right(a)

    override def map[A, B](fa: Either[E, A])(f: A => B): Either[E, B] = fa.map(f)
  }
}
```

Синтаксис:

```scala
object ApplicativeErrorSyntax {

  implicit class ApplicativeErrorRaiseOps[F[_], E](private val e: E) extends AnyVal {
    def raiseError[A](implicit ae: ApplicativeError[F, E]): F[A] =
      ae.raiseError(e)
  }

  implicit class ApplicativeErrorHandleOps[F[_], A](private val fa: F[A]) extends AnyVal {
    def handleErrorWith[E](f: E => F[A])(implicit ae: ApplicativeError[F, E]): F[A] =
      ae.handleErrorWith(fa)(f)
  }
}

// чтобы можно было делать
Error("Boom!").raiseError
fa.handleErrorWith { error => ... }
```

### Пример с делением

Давайте рассмотрим простой пример с функцией деления, реализованный с применением `Either`:

```scala
def divideEither(x: Double, y: Double): Either[String, Double] = {
  if (y == 0) Left("Деление на ноль")
  else Right(x / y)
}

println(divideEither(x = 4, y = 2))  // Right(2)
println(divideEither(x = 4, y = 0))  // Left("Деление на ноль")
```

Перепишем эту функцию, обобщив её посредством `ApplicativeError`:

```scala
def divide[F[_]](x: Double, y: Double)(implicit F: ApplicativeError[F, String]): F[Double] = {
  if (y == 0) "Деление на ноль".raiseError
  else (x / y).pure
}

type Error = String
type ErrorOr[A] = Either[Error, A]

divide[ErrorOr](x = 4, y = 2) // Right(2.0)
divide[ErrorOr](x = 4, y = 0) // Left(Деление на ноль)

divide[ErrorOr](x = 4, y = 0)
  .handleErrorWith[Error](
    error => s"Something went wrong: $error".raiseError
  ) // Left(Something went wrong: Деление на ноль)
```

### Пример с базой данных

К примеру, у нас есть некоторая база данных, в которой хранятся имена и год рождения персонажей, которые можно достать по `Id`:

```scala
type Id = Int
type Name = String
type ErrorMsg = String

val usersDatabase = Map[Id, Name](
  1 -> "Dutch van der Linde",
  2 -> "Arthur Morgan",
  3 -> "John Marston",
  4 -> "Hosea Matthews"
)

val bornYearDatabase = Map[Id, Int](
  1 -> 1855,
  2 -> 1863,
  3 -> 1873
)
```

Мы пишем функции `getUserNameById` и `getBornYearById`, которые умеют доставать эти значения из базы. В случае, если данные не найдены, то возвращается ошибка с типом `ErrorMsg` через `raiseError`. В функции `aboutPerson` мы обрабатываем ошибку посредством `handleErrorWith`:

```scala
def getUserNameById[F[_]](id: Id)(implicit ae: ApplicativeError[F, ErrorMsg]): F[Name] = {
  usersDatabase
    .get(id)
    .map(_.pure[F])
    .getOrElse("Name not found".raiseError)
}

def getBornYearById[F[_]](id: Id)(implicit ae: ApplicativeError[F, ErrorMsg]): F[Int] = {
  bornYearDatabase
    .get(id)
    .map(_.pure[F])
    .getOrElse("Born year not found".raiseError)
}

def aboutPerson[F[_]: FlatMap](id: Id)(implicit ae: ApplicativeError[F, ErrorMsg]): F[String] = {
  getUserNameById[F](id)
    .flatMap(name => getBornYearById(id).map(year => s"$name was born in $year"))
    .handleErrorWith[String](
      error => s"Something went wrong: $error".raiseError
    )
}
```

```scala
import ApplicativeErrorInstances._
import FlatMapInstances._

type ErrorOr[A] = Either[ErrorMsg, A]

// Happy path
println(aboutPerson[ErrorOr](id = 1)) // Right(Dutch van der Linde was born in 1855)
println(aboutPerson[ErrorOr](id = 2)) // Right(Arthur Morgan was born in 1863)

// Unhappy path
println(aboutPerson[ErrorOr](id = 4))   // Left(Something went wrong: Born year not found)
println(aboutPerson[ErrorOr](id = 999)) // Left(Something went wrong: Name not found)
```

---

## Законы тайпклассов

Свойства (или законы) абстракций, которые мы сегодня рассматривали, очень важны, поскольку они удобны, если им следуют все. Как и в случае с дорожными правилами, которые предписывают ездить по одной стороне дороги в пределах определённой территории.

Мы пишем код, используя абстракции, и делаем предположения, что они должны удовлетворять своим свойствам (или законам), чтобы наш конечный код работал правильно.

Поэтому при использовании той или иной абстракции стоит понимать, какими свойствами (законами) она обладает.

### Список свойств и их описание

| Название | Описание |
|----------|----------|
| Associative (Ассоциативность) | Если `⊕` ассоциативна, то `a ⊕ (b ⊕ c)` = `(a ⊕ b) ⊕ c` |
| Commutative (Коммутативность) | Если `⊕` коммутативна, то `a ⊕ b` = `b ⊕ a` |
| Identity (Идентичность) | Если `id` — идентичный элемент для `⊕`, то `a ⊕ id` = `id ⊕ a` = `a` |
| Inverse (Обратный элемент) | Если `¬` — обратный элемент для `⊕` и `id`, то `a ⊕ ¬a` = `¬a ⊕ a` = `id` |
| Distributive (Дистрибутивность) | Если `⊕` и `⊙` дистрибутивны, то `a ⊙ (b ⊕ c)` = `(a ⊙ b) ⊕ (a ⊙ c)` и `(a ⊕ b) ⊙ c` = `(a ⊙ c) ⊕ (b ⊙ c)` |
| Idempotent (Идемпотентность) | Если `⊕` идемпотентна, то `a ⊕ a` = `a`. Если `f` идемпотентна, то `f(f(a))` = `f(a)` |

---

## Библиотека Cats

> Cats (categories) is a library which provides abstractions for functional programming in the Scala programming language

Cats — это библиотека, которая предоставляет абстракции для функционального программирования на Scala. Она содержит все тайпклассы, которые мы рассмотрели на этой лекции, и многое другое.

### Подключение Cats

```scala
libraryDependencies += "org.typelevel" %% "cats-core" % "2.10.0"
```

### Использование

```scala
import cats._
import cats.implicits._

// Semigroup и Monoid
1 |+| 2 |+| 3                    // 6
List(1, 2) |+| List(3, 4)        // List(1, 2, 3, 4)
Monoid[Int].empty                // 0

// Functor
List(1, 2, 3).map(_ + 1)         // List(2, 3, 4)

// Applicative
42.pure[Option]                   // Some(42)
(Option(1), Option(2)).mapN(_ + _) // Some(3)

// FlatMap / Monad
for {
  x <- Option(1)
  y <- Option(2)
} yield x + y                     // Some(3)

// Traverse
List(Some(1), Some(2), Some(3)).sequence // Some(List(1, 2, 3))
List(1, 2, 3).traverse(x => Option(x * 2)) // Some(List(2, 4, 6))
```

### Полезные ссылки

- [Официальная документация Cats](https://typelevel.org/cats/)
- [Scala with Cats (книга)](https://www.scalawithcats.com/)
- [Herding Cats (туториал)](https://eed3si9n.com/herding-cats/)

---

## Заключение

В этой лекции мы рассмотрели:

- **Semigroup и Monoid** — абстракции для комбинирования значений с гарантией ассоциативности
- **Functor** — абстракция для трансформации значений внутри контекста
- **Foldable** — абстракция для свёртки структур данных к одному значению
- **Applicative** — абстракция для поднятия значений в контекст и комбинирования независимых вычислений
- **Traverse** — абстракция для обхода структур данных с эффектами
- **FlatMap** — абстракция для последовательных зависимых вычислений
- **ApplicativeError** — расширение для обработки ошибок

Понимание этих абстракций позволяет писать максимально обобщённый код, который работает с любыми типами, реализующими соответствующие тайпклассы.

---

[← Назад к содержанию](../index.html)
