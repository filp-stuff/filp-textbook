---
layout: page
title: Implicits и Typeclasses
---

# Implicits и Typeclasses

В этом разделе мы изучим механизм имплиситов (implicits) в Scala — мощный инструмент, позволяющий компилятору автоматически подставлять значения и преобразования. На основе имплиситов мы также рассмотрим паттерн тайпклассов (type classes) — фундаментальную концепцию функционального программирования.

---

## Содержание

- [Implicit conversions (неявные преобразования)](#implicit-conversions-неявные-преобразования)
- [Implicit parameters (неявные параметры)](#implicit-parameters-неявные-параметры)
- [Implicit scopes and priorities (области видимости и приоритеты)](#implicit-scopes-and-priorities-области-видимости-и-приоритеты)
- [Implicit classes (неявные классы)](#implicit-classes-неявные-классы)
- [Type classes (тайпклассы)](#type-classes-тайпклассы)
- [Простые тайпклассы: Show и Eq](#простые-тайпклассы-show-и-eq)

---

## Implicit conversions (неявные преобразования)

### Проблема: несовместимость типов

Рассмотрим простой пример:

```scala
val x: String = 123
```

Скомпилируется ли такой код? Конечно нет! Мы получим ошибку компиляции:

```
[error] type mismatch;
[error]  found   : Int(123)
[error]  required: String
[error]   val x: String = 123
```

Компилятор не позволяет присвоить строковому типу численное значение. Но в Scala есть механизм, позволяющий сделать такой код корректным — **неявные преобразования (implicit conversions)**.

### Определение неявного преобразования

```scala
implicit def intToString(x: Int): String = x.toString

val x: String = 123  // будет вызвана неявная функция intToString
// x: String = "123"
```

Что здесь происходит? Функция `intToString` помечена ключевым словом `implicit`, что позволяет компилятору вызывать её **неявно** — без явного указания в коде.

Когда компилятор видит несоответствие типов (ожидается `String`, а передаётся `Int`), он ищет в области видимости неявную функцию, способную выполнить преобразование `Int => String`. Найдя `intToString`, компилятор автоматически вставляет её вызов:

```scala
val x: String = intToString(123)  // то, что реально происходит
```

### Правила определения неявных функций

Для создания неявного преобразования необходимо соблюдать следующие правила:

1. **Использовать ключевое слово `implicit`** перед `def`
2. **Функция должна быть объявлена** в trait, class, object или методе (не на верхнем уровне файла)
3. **Должен быть ровно один параметр** в списке аргументов

```scala
// Корректные неявные преобразования
implicit def intToString(x: Int): String = x.toString
implicit def listToSet[A](list: List[A]): Set[A] = list.toSet

// Некорректно: два параметра
// implicit def add(a: Int, b: Int): Int = a + b  // не скомпилируется как conversion
```

### Предостережение

> **Важно!** С большой силой приходит большая ответственность!

Неосознанное использование неявных преобразований может привести к написанию сложного для понимания кода. Когда кодовая база растёт, становится трудно отследить, какие преобразования применяются и где.

**Рекомендации:**
- Применяйте неявные преобразования только там, где это **действительно улучшает** код
- Избегайте создания "магических" преобразований между несвязанными типами
- Документируйте используемые неявные преобразования
- В современном Scala 3 механизм был переработан в `given`/`using`, что делает его более явным

### Зачем изучать неявные преобразования?

Несмотря на предостережения, понимание механизма неявных преобразований важно по нескольким причинам:

1. **Это фундаментальный механизм языка**, на котором построены многие библиотеки
2. **Implicit conversions используются в стандартной библиотеке** (например, для обогащения Java-типов)
3. **Это основа для более продвинутых паттернов**, таких как тайпклассы
4. **Помогает читать существующий код** Scala-проектов

---

## Implicit parameters (неявные параметры)

Помимо неявных преобразований, в Scala можно определять **неявные параметры функций** — параметры, которые компилятор подставляет автоматически из области видимости.

### Базовый синтаксис

```scala
def multiply(x: Int)(implicit y: Int): Int = x * y

implicit val z: Int = 10

multiply(3)  // результат: 30 (y берётся из implicit val z)
multiply(4)  // результат: 40
```

В данном примере параметр `y` передаётся неявно. Компилятор находит в области видимости `implicit val z: Int` и подставляет его значение.

### Неоднозначность неявных значений

Если в области видимости есть несколько неявных значений одного типа, компилятор выдаст ошибку:

```scala
implicit val z: Int = 10
implicit val y: Int = 42

multiply(3)
// [error] ambiguous implicit values:
// [error]  both value z of type Int
// [error]  and value y of type Int
// [error]  match expected type Int
```

Компилятор не может определить, какое из значений использовать, и требует явного указания.

### Правила объявления неявных параметров

```scala
// x — неявный параметр
def func(implicit x: Int): Unit = ???

// x и y — оба неявные
def func(implicit x: Int, y: Int): Unit = ???

// НЕ скомпилируется: implicit не может быть в середине списка
def func(x: Int, implicit y: Int): Unit = ???  // ошибка!

// Только y неявный (разные списки параметров)
def func(x: Int)(implicit y: Int): Unit = ???

// НЕ скомпилируется: implicit должен быть в последнем списке
def func(implicit x: Int)(y: Int): Unit = ???  // ошибка!

// НЕ скомпилируется: только один implicit-список параметров
def func(implicit x: Int)(implicit y: Int): Unit = ???  // ошибка!
```

**Запомните:** ключевое слово `implicit` применяется **ко всем параметрам** в данном списке и может быть только в **последнем списке параметров**.

### Несколько неявных параметров разных типов

```scala
def configure(host: String)(implicit port: Int, timeout: Long): Unit =
  println(s"Connecting to $host:$port with timeout $timeout ms")

implicit val defaultPort: Int = 8080
implicit val defaultTimeout: Long = 5000L

configure("localhost")  // Connecting to localhost:8080 with timeout 5000 ms
```

### Практический пример: контекст запроса

Рассмотрим пример, приближенный к реальной разработке. Допустим, у нас есть приложение с логированием, и нам нужно передавать контекст запроса (например, ID запроса) для трассировки:

**Без неявных параметров:**

```scala
case class RequestContext(requestId: String, userId: Option[String])

class Logger {
  def log(message: String)(ctx: RequestContext): Unit =
    println(s"[${ctx.requestId}] $message")
}

class UserService(logger: Logger) {
  def getUser(id: String)(ctx: RequestContext): Option[User] = {
    logger.log(s"Fetching user $id")(ctx)
    // ... логика получения пользователя
    None
  }
}

class OrderService(logger: Logger, userService: UserService) {
  def createOrder(userId: String, items: List[Item])(ctx: RequestContext): Order = {
    logger.log("Creating order")(ctx)
    userService.getUser(userId)(ctx)
    logger.log("Order created")(ctx)
    // ...
    Order(...)
  }
}

// Использование — приходится везде явно передавать ctx
val ctx = RequestContext("req-123", Some("user-456"))
orderService.createOrder("user-456", items)(ctx)
```

**С неявными параметрами:**

```scala
case class RequestContext(requestId: String, userId: Option[String])

class Logger {
  def log(message: String)(implicit ctx: RequestContext): Unit =
    println(s"[${ctx.requestId}] $message")
}

class UserService(logger: Logger) {
  def getUser(id: String)(implicit ctx: RequestContext): Option[User] = {
    logger.log(s"Fetching user $id")  // ctx передаётся неявно
    // ...
    None
  }
}

class OrderService(logger: Logger, userService: UserService) {
  def createOrder(userId: String, items: List[Item])(implicit ctx: RequestContext): Order = {
    logger.log("Creating order")       // ctx передаётся неявно
    userService.getUser(userId)        // ctx передаётся неявно
    logger.log("Order created")        // ctx передаётся неявно
    // ...
    Order(...)
  }
}

// Использование — контекст определяется один раз
implicit val ctx: RequestContext = RequestContext("req-123", Some("user-456"))
orderService.createOrder("user-456", items)  // ctx подставляется автоматически
```

Неявные параметры позволяют:
- **Уменьшить количество boilerplate-кода**
- **Упростить бизнес-логику**, убрав повторяющиеся передачи контекста
- **Сделать код более читаемым**, фокусируясь на главном

---

## Implicit scopes and priorities (области видимости и приоритеты)

Компилятор использует только те неявные значения и преобразования, которые находятся **в области видимости**. Понимание правил разрешения имплиситов критически важно для эффективной работы с ними.

### Локальная область видимости (Local Scope)

Неявные значения, определённые в текущей области видимости, имеют **наивысший приоритет**:

```scala
object Example {
  implicit def intToString(x: Int): String = x.toString

  val x: String = 123  // используется локальный intToString
}
```

### Импорты (Imports)

Имплиситы можно импортировать из других объектов:

```scala
object ExternalImplicits {
  implicit def intToString(x: Int): String = x.toString
}

object Example {
  import ExternalImplicits.intToString
  // или
  import ExternalImplicits._

  val x: String = 123  // используется импортированный intToString
}
```

### Объекты-компаньоны (Companion Objects)

Компилятор автоматически ищет имплиситы в объектах-компаньонах типов, участвующих в преобразовании:

```scala
sealed trait Currency
case class Dollar(amount: Double) extends Currency
case class Euro(amount: Double) extends Currency

object Currency {
  implicit def euroToDollar(euro: Euro): Dollar =
    Dollar(euro.amount * 1.13)
}

object Example extends App {
  val dollar: Dollar = Euro(100)  // euroToDollar найден в Currency companion object
  // dollar: Dollar = Dollar(113.0)
}
```

### Приоритеты разрешения

Если имплиситы определены в нескольких местах, применяются следующие приоритеты (от высшего к низшему):

1. **Локальная область видимости** (определено в текущем блоке)
2. **Явный импорт** (`import X.y`)
3. **Wildcard импорт** (`import X._`)
4. **Объекты-компаньоны** типов-участников

```scala
trait Currency
case class Dollar(amount: Double) extends Currency
case class Euro(amount: Double) extends Currency

object Currency {
  implicit def euroToDollar(euro: Euro): Dollar =
    Dollar(euro.amount * 1.13)  // курс 1.13
}

object Example extends App {
  // Локальное определение имеет приоритет над companion object
  implicit def euroToDollar(euro: Euro): Dollar =
    Dollar(euro.amount)  // курс 1.0

  val dollar: Dollar = Euro(100)
  // dollar: Dollar = Dollar(100.0) — использован локальный implicit
}
```

### Правило специфичности

При наличии нескольких подходящих имплиситов компилятор выбирает **наиболее специфичный**:

```scala
implicit def anyToString(x: Any): String = x.toString
implicit def intToString(x: Int): String = s"int: $x"

val s: String = 42
// s: String = "int: 42" — intToString более специфичен для Int
```

---

## Implicit classes (неявные классы)

### Проблема расширения существующих типов

Между вашим кодом и библиотеками других разработчиков существует принципиальная разница: **свой код можно изменить**, но библиотеки приходится принимать такими, какие они есть.

Что делать, если хочется добавить новый метод к существующему типу (например, к `Int` из стандартной библиотеки)?

### Паттерн Adapter (ООП-подход)

В классическом ООП используется паттерн Adapter — создание класса-обёртки:

```scala
// Хотим добавить методы isEven и isOdd к Int
class RichInt(val value: Int) {
  def isEven: Boolean = value % 2 == 0
  def isOdd: Boolean = value % 2 != 0
}

// Использование — требуется явное оборачивание
val rich = new RichInt(42)
rich.isEven  // true

// Неудобно: нужно каждый раз создавать обёртку
new RichInt(10).isEven
new RichInt(15).isOdd
```

### Решение: Implicit classes

**Неявные классы** позволяют расширять функциональность типов без явного оборачивания:

```scala
implicit class RichInt(val value: Int) extends AnyVal {
  def isEven: Boolean = value % 2 == 0
  def isOdd: Boolean = value % 2 != 0
}

// Использование — вызов выглядит как встроенный метод
42.isEven   // true
15.isOdd    // true
100.isEven  // true
```

Компилятор автоматически оборачивает `Int` в `RichInt` при вызове методов `isEven` или `isOdd`.

### Что происходит под капотом?

Неявный класс — это синтаксический сахар. Компилятор преобразует его в обычный класс + неявное преобразование:

```scala
// Это:
implicit class RichInt(val value: Int) extends AnyVal {
  def isEven: Boolean = value % 2 == 0
}

// Эквивалентно этому:
class RichInt(val value: Int) extends AnyVal {
  def isEven: Boolean = value % 2 == 0
}
implicit def intToRichInt(value: Int): RichInt = new RichInt(value)
```

### Оптимизация: Value Classes

Обратите внимание на `extends AnyVal` в определении неявного класса. Это создаёт **value class** — механизм оптимизации в Scala.

```scala
implicit class RichInt(val value: Int) extends AnyVal {
  def square: Int = value * value
}

// Без AnyVal: при каждом вызове создаётся объект-обёртка в куче
// С AnyVal: обёртка существует только на уровне компилятора,
//           в runtime методы инлайнятся, объект не создаётся
```

**Преимущества value classes:**
- Нет аллокации объектов в куче
- Снижение нагрузки на сборщик мусора
- Производительность на уровне примитивных типов

**Ограничения value classes:**
- Единственный `val`-параметр в конструкторе
- Нет дополнительных полей
- Не могут наследоваться от других классов (кроме universal traits)

### Практические примеры неявных классов

```scala
// Расширение String
implicit class RichString(val s: String) extends AnyVal {
  def toSlug: String = s.toLowerCase.replaceAll("\\s+", "-")
  def truncate(maxLength: Int): String =
    if (s.length <= maxLength) s
    else s.take(maxLength - 3) + "..."
}

"Hello World".toSlug        // "hello-world"
"A very long title".truncate(10)  // "A very..."

// Расширение коллекций
implicit class RichList[A](val list: List[A]) extends AnyVal {
  def second: Option[A] = list.drop(1).headOption
  def penultimate: Option[A] = list.dropRight(1).lastOption
}

List(1, 2, 3, 4).second       // Some(2)
List(1, 2, 3, 4).penultimate  // Some(3)

// Расширение числовых типов
implicit class RichDouble(val d: Double) extends AnyVal {
  def squared: Double = d * d
  def cubed: Double = d * d * d
  def roundTo(decimals: Int): Double = {
    val factor = math.pow(10, decimals)
    math.round(d * factor) / factor
  }
}

3.14159.roundTo(2)  // 3.14
2.0.cubed           // 8.0
```

### Ключевые особенности неявных классов

> **Неявные классы позволяют расширять функционал типов и классов, не прибегая к наследованию или изменению исходного кода.**

Это известно как паттерн **"Extension Methods"** или **"Pimp My Library"** pattern.

---

## Type classes (тайпклассы)

### Что такое тайпкласс?

> **Тайпкласс** — это паттерн, используемый в функциональном программировании для обеспечения **Ad-hoc полиморфизма**.

Ad-hoc полиморфизм (или перегрузка) позволяет функциям работать с аргументами разных типов, предоставляя **разные реализации для каждого типа**.

### Полиморфизм через наследование (ООП)

В классическом ООП полиморфизм достигается через наследование:

```scala
trait Printable {
  def print(): String
}

case class Person(name: String, age: Int) extends Printable {
  def print(): String = s"Person: $name, $age"
}

case class Product(name: String, price: Double) extends Printable {
  def print(): String = s"Product: $name, $$price"
}

def printAll(items: List[Printable]): Unit =
  items.foreach(item => println(item.print()))
```

**Проблемы такого подхода:**
1. **Требует модификации классов** — нужно добавить `extends Printable`
2. **Не работает с чужими классами** — нельзя изменить `Int`, `String` или классы из внешних библиотек
3. **Один тип может иметь только одну реализацию** трейта

### Полиморфизм через тайпклассы (FP)

Тайпклассы решают эти проблемы, **отделяя поведение от типа**:

```scala
// 1. Определяем тайпкласс (trait с типовым параметром)
trait Printable[A] {
  def print(value: A): String
}

// 2. Создаём инстансы для нужных типов
implicit val personPrintable: Printable[Person] = new Printable[Person] {
  def print(value: Person): String = s"Person: ${value.name}, ${value.age}"
}

implicit val intPrintable: Printable[Int] = new Printable[Int] {
  def print(value: Int): String = s"Int: $value"
}

// 3. Используем тайпкласс через неявные параметры
def printValue[A](value: A)(implicit p: Printable[A]): String =
  p.print(value)

printValue(Person("Alice", 30))  // "Person: Alice, 30"
printValue(42)                    // "Int: 42"
```

### Анатомия тайпкласса

Тайпкласс состоит из четырёх компонентов:

```
┌─────────────────────────────────────────────────────────────┐
│                    Структура тайпкласса                     │
├─────────────────────────────────────────────────────────────┤
│  1. Trait (сам тайпкласс)                                   │
│     trait MyTypeClass[A] { ... }                            │
├─────────────────────────────────────────────────────────────┤
│  2. Методы тайпкласса                                       │
│     def operation(value: A): Result                         │
├─────────────────────────────────────────────────────────────┤
│  3. Инстансы тайпкласса                                     │
│     implicit val instance: MyTypeClass[ConcreteType] = ...  │
├─────────────────────────────────────────────────────────────┤
│  4. Синтаксис (опционально)                                 │
│     implicit class Syntax[A](value: A) {                    │
│       def operation(implicit tc: MyTypeClass[A]) = ...      │
│     }                                                       │
└─────────────────────────────────────────────────────────────┘
```

### Полный пример тайпкласса

```scala
// 1. Trait — определение тайпкласса
trait JsonEncoder[A] {
  def encode(value: A): String
}

// 2. Объект-компаньон с вспомогательными методами
object JsonEncoder {
  // Метод для получения инстанса
  def apply[A](implicit encoder: JsonEncoder[A]): JsonEncoder[A] = encoder

  // Вспомогательный метод для создания инстансов
  def instance[A](f: A => String): JsonEncoder[A] = new JsonEncoder[A] {
    def encode(value: A): String = f(value)
  }
}

// 3. Инстансы для базовых типов
implicit val stringEncoder: JsonEncoder[String] =
  JsonEncoder.instance(s => s"\"$s\"")

implicit val intEncoder: JsonEncoder[Int] =
  JsonEncoder.instance(_.toString)

implicit val booleanEncoder: JsonEncoder[Boolean] =
  JsonEncoder.instance(_.toString)

// Инстанс для пользовательского типа
case class Person(name: String, age: Int)

implicit val personEncoder: JsonEncoder[Person] =
  JsonEncoder.instance { p =>
    s"""{"name": "${p.name}", "age": ${p.age}}"""
  }

// 4. Синтаксис — добавляем метод .toJson к любому типу с JsonEncoder
implicit class JsonEncoderOps[A](val value: A) extends AnyVal {
  def toJson(implicit encoder: JsonEncoder[A]): String =
    encoder.encode(value)
}

// Использование
"hello".toJson               // "\"hello\""
42.toJson                    // "42"
Person("Alice", 30).toJson   // {"name": "Alice", "age": 30}
```

### Преимущества тайпклассов

| Аспект | Наследование | Тайпклассы |
|--------|--------------|------------|
| Расширение чужих типов | Невозможно | Возможно |
| Несколько реализаций для типа | Нет | Да (разные инстансы) |
| Модификация классов | Требуется | Не требуется |
| Проверка на этапе компиляции | Да | Да |
| Композиция поведений | Сложно | Просто |

### Тайпклассы в других языках

Паттерн тайпклассов возник в Haskell и был адаптирован для Scala:

- **Haskell**: встроенная поддержка через `class` и `instance`
- **Rust**: traits с `impl`
- **Swift**: protocols с extensions
- **Scala 2**: traits + implicits (как мы рассмотрели)
- **Scala 3**: `given`/`using` — более явный и понятный синтаксис

```scala
// Scala 3 синтаксис
trait JsonEncoder[A]:
  def encode(value: A): String

given JsonEncoder[Int] with
  def encode(value: Int): String = value.toString

def toJson[A](value: A)(using encoder: JsonEncoder[A]): String =
  encoder.encode(value)
```

---

## Простые тайпклассы: Show и Eq

Рассмотрим два классических тайпкласса из функционального программирования, которые решают проблемы стандартных Java-методов.

### Show — типобезопасный toString

#### Проблема с toString

В Java (и Scala) метод `toString` определён для `Any`/`Object` и может быть вызван на чём угодно:

```scala
(new {}).toString
// res0: String = "repl.MdocSession$MdocApp$$anon$1@7de74c88"
```

Это нежелательное поведение, поскольку:
1. Стандартная реализация возвращает бессмысленную строку
2. Компилятор не предупреждает о вызове на типах без осмысленной реализации
3. Легко получить неинформативный вывод в production

#### Решение: тайпкласс Show

```scala
trait Show[A] {
  def show(value: A): String
}

object Show {
  def apply[A](implicit instance: Show[A]): Show[A] = instance

  def instance[A](f: A => String): Show[A] = new Show[A] {
    def show(value: A): String = f(value)
  }
}

// Инстансы для базовых типов
implicit val showInt: Show[Int] = Show.instance(_.toString)
implicit val showString: Show[String] = Show.instance(identity)
implicit val showBoolean: Show[Boolean] = Show.instance(_.toString)

// Инстанс для пользовательского типа
case class Person(name: String, age: Int)

implicit val showPerson: Show[Person] = Show.instance { p =>
  s"Person(name = ${p.name}, age = ${p.age})"
}

// Синтаксис
implicit class ShowOps[A](val value: A) extends AnyVal {
  def show(implicit s: Show[A]): String = s.show(value)
}
```

#### Использование Show

```scala
42.show                    // "42"
"hello".show               // "hello"
Person("Alice", 30).show   // "Person(name = Alice, age = 30)"

// Попытка вызвать show на типе без инстанса — ошибка компиляции!
// (new {}).show
// error: could not find implicit value for parameter s: Show[AnyRef {...}]
```

Теперь компилятор **гарантирует**, что метод `show` можно вызвать только на типах, для которых определено строковое представление.

#### Автоматический вывод инстансов

Для составных типов можно определить правила автоматического вывода:

```scala
// Инстанс для Option[A], если есть инстанс для A
implicit def showOption[A](implicit showA: Show[A]): Show[Option[A]] =
  Show.instance {
    case Some(a) => s"Some(${showA.show(a)})"
    case None    => "None"
  }

// Инстанс для List[A], если есть инстанс для A
implicit def showList[A](implicit showA: Show[A]): Show[List[A]] =
  Show.instance { list =>
    list.map(showA.show).mkString("List(", ", ", ")")
  }

// Теперь работает автоматически:
Option(42).show                    // "Some(42)"
List(1, 2, 3).show                 // "List(1, 2, 3)"
List(Person("A", 1), Person("B", 2)).show
// "List(Person(name = A, age = 1), Person(name = B, age = 2))"
```

### Eq — типобезопасное сравнение на равенство

#### Проблема с equals

В Scala оператор `==` (который делегирует к `equals`) позволяет сравнивать **любые** два значения:

```scala
"hello" == 42     // false, но компилируется!
List(1) == "test" // false, но компилируется!
```

Это может привести к ошибкам, которые сложно обнаружить:

```scala
case class UserId(value: Long)
case class OrderId(value: Long)

val userId = UserId(123)
val orderId = OrderId(123)

userId == orderId  // false, но это логическая ошибка!
// Мы никогда не должны сравнивать UserId с OrderId
```

#### Решение: тайпкласс Eq

```scala
trait Eq[A] {
  def eqv(x: A, y: A): Boolean
  def neqv(x: A, y: A): Boolean = !eqv(x, y)
}

object Eq {
  def apply[A](implicit instance: Eq[A]): Eq[A] = instance

  def instance[A](f: (A, A) => Boolean): Eq[A] = new Eq[A] {
    def eqv(x: A, y: A): Boolean = f(x, y)
  }

  // Создание инстанса через стандартный ==
  def fromUniversalEquals[A]: Eq[A] = instance(_ == _)
}

// Инстансы
implicit val eqInt: Eq[Int] = Eq.fromUniversalEquals
implicit val eqString: Eq[String] = Eq.fromUniversalEquals
implicit val eqBoolean: Eq[Boolean] = Eq.fromUniversalEquals

case class UserId(value: Long)
implicit val eqUserId: Eq[UserId] = Eq.fromUniversalEquals

// Синтаксис
implicit class EqOps[A](val x: A) extends AnyVal {
  def ===(y: A)(implicit eq: Eq[A]): Boolean = eq.eqv(x, y)
  def =!=(y: A)(implicit eq: Eq[A]): Boolean = eq.neqv(x, y)
}
```

#### Использование Eq

```scala
42 === 42          // true
"hello" === "hello" // true

UserId(123) === UserId(123)  // true
UserId(123) === UserId(456)  // false

// Попытка сравнить разные типы — ошибка компиляции!
// "hello" === 42
// error: type mismatch; found: Int, required: String

// UserId(123) === OrderId(123)
// error: could not find implicit value for parameter eq: Eq[...]
```

#### Автоматический вывод для Option и коллекций

```scala
implicit def eqOption[A](implicit eqA: Eq[A]): Eq[Option[A]] =
  Eq.instance {
    case (Some(a), Some(b)) => eqA.eqv(a, b)
    case (None, None)       => true
    case _                  => false
  }

implicit def eqList[A](implicit eqA: Eq[A]): Eq[List[A]] =
  Eq.instance { (xs, ys) =>
    xs.length == ys.length &&
      xs.zip(ys).forall { case (x, y) => eqA.eqv(x, y) }
  }

// Использование
Option(42) === Option(42)           // true
Option(42) === None                  // false
List(1, 2, 3) === List(1, 2, 3)     // true
List(1, 2) === List(1, 2, 3)        // false
```

### Сравнение: стандартные методы vs тайпклассы

| Аспект | toString / equals | Show / Eq |
|--------|-------------------|-----------|
| Тип-безопасность | Нет | Да |
| Контроль компилятора | Нет | Да |
| Работает для любого типа | Да (бессмысленно) | Только для типов с инстансом |
| Расширяемость | Наследование | Инстансы |
| Несколько реализаций | Нет | Да |

---

## Резюме

В этой лекции мы рассмотрели:

1. **Implicit conversions** — механизм автоматического преобразования типов
   - Определяются через `implicit def` с одним параметром
   - Используйте с осторожностью, избегая "магии"

2. **Implicit parameters** — параметры, подставляемые компилятором
   - Помечаются `implicit` в последнем списке параметров
   - Позволяют передавать контекст без явного указания

3. **Области видимости имплиситов** — правила поиска и приоритеты
   - Локальный scope > явный импорт > wildcard импорт > companion objects

4. **Implicit classes** — расширение типов без модификации
   - Паттерн "Extension Methods"
   - Оптимизация через `extends AnyVal`

5. **Type classes** — паттерн ad-hoc полиморфизма
   - Отделение поведения от типа
   - Trait + инстансы + синтаксис

6. **Show и Eq** — типобезопасные альтернативы toString и equals
   - Проверка на этапе компиляции
   - Автоматический вывод для составных типов

Понимание имплиситов и тайпклассов открывает двери к продвинутым библиотекам функционального программирования в Scala (Cats, Scalaz, ZIO), где эти паттерны используются повсеместно.

---

[← Назад к содержанию](../index.html)
