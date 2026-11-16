// CardSwipe.cs  (повесь на объект карточки, внутри Canvas)
using System.Collections;
using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;

public class CardSwipe : MonoBehaviour, IBeginDragHandler, IDragHandler, IEndDragHandler
{
    public Canvas canvas;
    public AnswerFade leftFade, rightFade;   // вместо leftBanner и rightBanner
    public TMP_Text leftText, rightText;     // как и раньше
    public float deadZone = 30f;  
    public float threshold = 150f, maxAngle = 15f;

    public float appearTime = 0.25f;
    Coroutine appear;

    public SwipeFeedback feedback;

    RectTransform rt;
    Vector2 home;

    public AudioClip pickClip, swipeClip, returnClip;

    void Sfx(AudioClip c) { if (SfxPlayer.I) SfxPlayer.I.Play(c); }

    bool SideExists(float x)
    {
        var card = GameManager.I.Current;
        return x < 0 ? card.left.Exists : card.right.Exists;
    }

    void Start()
    {
        GameManager.I.CardDrawn += OnCard;
        if (GameManager.I.Current != null) PlayAppear();   // первая карточка могла появиться раньше подписки
    }

    void OnDestroy()
    {
        if (GameManager.I) GameManager.I.CardDrawn -= OnCard;
    }

    void OnCard(CardData c) => PlayAppear();

    void PlayAppear()
    {
        if (appear != null) StopCoroutine(appear);
        appear = StartCoroutine(Appear());
    }

    IEnumerator Appear()
    {
        rt.localScale = new Vector3(0f, 1f, 1f);   // сразу схлопываем, чтобы не мелькнула целая карточка

        for (float t = 0f; t < appearTime; t += Time.deltaTime)
        {
            float k = 1f - Mathf.Pow(1f - t / appearTime, 3f);   // быстрый старт, мягкое замедление
            rt.localScale = new Vector3(k, 1f, 1f);
            yield return null;
        }
        rt.localScale = Vector3.one;
    }
    public void OnBeginDrag(PointerEventData e)
    {
        Sfx(pickClip);

        var cur = GameManager.I.Current;     // подписи ставим один раз, когда взяли карточку
        leftText.text = cur.left.label;
        rightText.text = cur.right.label;
    }

    void Awake() { rt = (RectTransform)transform; home = rt.anchoredPosition; }

    void ShowAnswer(float x)
    {
        var cur = GameManager.I.Current;
        float p = Mathf.InverseLerp(deadZone, threshold, Mathf.Abs(x));   // 0..1

        bool hasLeft  = !string.IsNullOrWhiteSpace(cur.left.label);
        bool hasRight = !string.IsNullOrWhiteSpace(cur.right.label);

        leftFade.Set(x > 0 && hasLeft ? p : 0f);
        rightFade.Set(x < 0 && hasRight ? p : 0f);
    }

    public void OnDrag(PointerEventData e)
    {
        rt.anchoredPosition += new Vector2(e.delta.x / canvas.scaleFactor, 0);
        float x = rt.anchoredPosition.x - home.x;
        rt.localRotation = Quaternion.Euler(0, 0, -x / threshold * maxAngle);
        if (feedback) feedback.Drag(SideExists(x) ? x : 0f, threshold);

        var cur = GameManager.I.Current;
        ShowAnswer(x);
    }

    public void OnEndDrag(PointerEventData e)
    {
        float x = rt.anchoredPosition.x - home.x;
        bool commit = Mathf.Abs(x) > threshold;
        if (feedback) feedback.Release(x, commit && SideExists(x));
        if (Mathf.Abs(x) > threshold)
        {
            Sfx(swipeClip);
            StartCoroutine(FlyAway(x > 0));
        }
        else
        {
            Sfx(returnClip);
            StartCoroutine(MoveTo(home, 0.15f));
        }
        ShowAnswer(0);
    }

    IEnumerator FlyAway(bool right)
    {
        yield return MoveTo(home + new Vector2(right ? 1200 : -1200, 0), 0.2f);
        GameManager.I.Choose(right);
        rt.anchoredPosition = home;
        rt.localRotation = Quaternion.identity;
    }

    IEnumerator MoveTo(Vector2 target, float time)
    {
        Vector2 start = rt.anchoredPosition;
        for (float t = 0; t < time; t += Time.deltaTime)
        {
            rt.anchoredPosition = Vector2.Lerp(start, target, t / time);
            yield return null;
        }
        rt.anchoredPosition = target;
        if (target == home) rt.localRotation = Quaternion.identity;
    }
}
